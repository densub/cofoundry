import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { generateMatchInsights, MatchInsights } from '../services/llm'
import { projectContextFromNode } from '../services/projectContext'
import {
  dedupeInsights,
  fingerprintInsights,
  fingerprintUserProjects,
  isWithinTtl,
} from '../services/matchCache'

const router = Router()
router.use(authMiddleware)

interface MatchedNode {
  myNodeId: string
  myNodeTitle: string
  myNodeType: string
  theirNodeId: string
  theirNodeTitle: string
  theirNodeType: string
  similarity: number
}

const MAX_PROJECT_PAIRS = 3

interface UserMatch {
  userId: string
  displayName: string | null
  role: string | null
  avatarUrl: string | null
  score: number
  matchedNodes: MatchedNode[]
  cached?: boolean
}

async function loadCachedMatches(userId: string): Promise<UserMatch[]> {
  const { data: rows } = await supabaseAdmin
    .from('matches')
    .select('id, user_id_1, user_id_2, similarity_score, matched_nodes, status')
    .eq('user_id_1', userId)
    .eq('status', 'pending')
    .order('similarity_score', { ascending: false })

  if (!rows?.length) return []

  const otherIds = rows.map(r => r.user_id_2)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, role, avatar_url')
    .in('id', otherIds)

  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  return rows.map(row => {
    const p = profileById.get(row.user_id_2)
    const matchedNodes = (row.matched_nodes as MatchedNode[]) ?? []
    return {
      userId: row.user_id_2,
      displayName: p?.display_name ?? null,
      role: p?.role ?? null,
      avatarUrl: p?.avatar_url ?? null,
      score: row.similarity_score,
      matchedNodes,
      cached: true,
    }
  })
}

async function computeMatches(
  userId: string,
  threshold: number,
  limit: number
): Promise<UserMatch[]> {
  const { data: myNodes } = await supabaseAdmin
    .from('nodes')
    .select('id, title, type, embedding')
    .eq('user_id', userId)
    .eq('type', 'project')
    .not('embedding', 'is', null)

  if (!myNodes?.length) return []

  const matchMap = new Map<string, UserMatch>()

  await Promise.all(
    myNodes.slice(0, 5).map(async myNode => {
      const { data: similar } = await supabaseAdmin.rpc('match_nodes', {
        query_embedding: myNode.embedding,
        match_threshold: threshold,
        match_count: 20,
        exclude_user_id: userId,
      })

      if (!similar) return

      for (const match of similar as Array<{
        user_id: string
        id: string
        title: string
        type: string
        similarity: number
      }>) {
        if (match.type !== 'project') continue

        if (!matchMap.has(match.user_id)) {
          matchMap.set(match.user_id, {
            userId: match.user_id,
            displayName: null,
            role: null,
            avatarUrl: null,
            score: 0,
            matchedNodes: [],
          })
        }
        const entry = matchMap.get(match.user_id)!
        entry.matchedNodes.push({
          myNodeId: myNode.id,
          myNodeTitle: myNode.title,
          myNodeType: 'project',
          theirNodeId: match.id,
          theirNodeTitle: match.title,
          theirNodeType: 'project',
          similarity: match.similarity,
        })
      }
    })
  )

  if (!matchMap.size) return []

  const userIds = Array.from(matchMap.keys())
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, role, avatar_url')
    .in('id', userIds)

  for (const p of profiles ?? []) {
    const entry = matchMap.get(p.id)
    if (entry) {
      entry.displayName = p.display_name
      entry.role = p.role
      entry.avatarUrl = p.avatar_url
    }
  }

  return Array.from(matchMap.values())
    .map(m => {
      m.matchedNodes.sort((a, b) => b.similarity - a.similarity)
      m.matchedNodes = m.matchedNodes.slice(0, MAX_PROJECT_PAIRS)
      m.score = m.matchedNodes[0]?.similarity ?? 0
      return m
    })
    .filter(m => m.matchedNodes.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

async function persistMatches(userId: string, matches: UserMatch[], graphFingerprint: string) {
  await Promise.all(
    matches.map(m =>
      supabaseAdmin.from('matches').upsert(
        {
          user_id_1: userId,
          user_id_2: m.userId,
          similarity_score: m.score,
          matched_nodes: m.matchedNodes,
          insights: null,
          insights_fingerprint: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id_1,user_id_2' }
      )
    )
  )

  await supabaseAdmin
    .from('profiles')
    .update({
      match_graph_fingerprint: graphFingerprint,
      matches_cached_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

// Find similar users based on node embeddings (cached unless ?refresh=true)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const threshold = parseFloat(req.query.threshold as string) || 0.65
  const limit = parseInt(req.query.limit as string) || 10
  const refresh = req.query.refresh === 'true'

  const { data: myNodes } = await req.supabase!
    .from('nodes')
    .select('id, updated_at')
    .eq('user_id', req.userId)
    .eq('type', 'project')
    .not('embedding', 'is', null)

  if (!myNodes?.length) {
    res.json({
      matches: [],
      cached: false,
      message: 'Import GitHub projects first (Integrations → GitHub → Import) to enable project-based matching',
    })
    return
  }

  const graphFingerprint = fingerprintUserProjects(myNodes)

  if (!refresh) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('match_graph_fingerprint, matches_cached_at')
      .eq('id', req.userId)
      .single()

    if (
      profile?.match_graph_fingerprint === graphFingerprint &&
      isWithinTtl(profile.matches_cached_at)
    ) {
      const cached = await loadCachedMatches(req.userId!)
      if (cached.length > 0) {
        res.json({ matches: cached.slice(0, limit), cached: true })
        return
      }
    }
  }

  const matches = await computeMatches(req.userId!, threshold, limit)

  if (matches.length > 0) {
    await persistMatches(req.userId!, matches, graphFingerprint)
  }

  res.json({ matches, cached: false })
})

// AI breakdown for a specific match (cached in DB + in-flight dedupe)
router.post('/insights', async (req: AuthRequest, res: Response): Promise<void> => {
  const { otherUserId, matchedNodes, refresh } = req.body as {
    otherUserId?: string
    matchedNodes?: MatchedNode[]
    refresh?: boolean
  }

  if (!otherUserId || otherUserId === req.userId) {
    res.status(400).json({ error: 'Invalid otherUserId' })
    return
  }

  const projectPairs = (matchedNodes ?? []).filter(
    m => m.myNodeType === 'project' && m.theirNodeType === 'project'
  )

  if (!projectPairs.length) {
    res.status(400).json({ error: 'No project pairs to analyze' })
    return
  }

  try {
    const nodeIds = [
      ...projectPairs.map(m => m.myNodeId),
      ...projectPairs.map(m => m.theirNodeId),
    ]

    const [{ data: matchRow }, { data: profiles }, { data: nodes }] = await Promise.all([
      supabaseAdmin
        .from('matches')
        .select('id, insights, insights_fingerprint')
        .eq('user_id_1', req.userId)
        .eq('user_id_2', otherUserId)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('id, display_name, role, bio')
        .in('id', [req.userId, otherUserId]),
      supabaseAdmin
        .from('nodes')
        .select('id, title, type, summary, content, metadata, updated_at')
        .in('id', nodeIds),
    ])

    const nodeVersions = new Map(
      (nodes ?? []).map(n => [n.id, n.updated_at ?? ''])
    )
    const insightsFp = fingerprintInsights(projectPairs, nodeVersions)

    if (!refresh && matchRow?.insights && matchRow.insights_fingerprint === insightsFp) {
      res.json({ ...(matchRow.insights as MatchInsights), cached: true })
      return
    }

    const insights = await dedupeInsights(
      `${req.userId}:${otherUserId}:${insightsFp}`,
      async () => {
        const me = profiles?.find(p => p.id === req.userId)
        const them = profiles?.find(p => p.id === otherUserId)
        const myById = new Map((nodes ?? []).filter(n => projectPairs.some(p => p.myNodeId === n.id)).map(n => [n.id, n]))
        const theirById = new Map(
          (nodes ?? []).filter(n => projectPairs.some(p => p.theirNodeId === n.id)).map(n => [n.id, n])
        )

        const pairs = projectPairs.map(m => {
          const mine = myById.get(m.myNodeId)
          const theirs = theirById.get(m.theirNodeId)
          const myCtx = projectContextFromNode({
            title: mine?.title ?? m.myNodeTitle,
            summary: mine?.summary ?? null,
            content: mine?.content ?? null,
            metadata: mine?.metadata as Record<string, unknown> | null,
          })
          const theirCtx = projectContextFromNode({
            title: theirs?.title ?? m.theirNodeTitle,
            summary: theirs?.summary ?? null,
            content: theirs?.content ?? null,
            metadata: theirs?.metadata as Record<string, unknown> | null,
          })
          return {
            myTitle: myCtx.title,
            myStack: myCtx.stack,
            myDescription: myCtx.description,
            myUrl: myCtx.url,
            theirTitle: theirCtx.title,
            theirStack: theirCtx.stack,
            theirDescription: theirCtx.description,
            theirUrl: theirCtx.url,
            similarity: m.similarity,
          }
        })

        return generateMatchInsights({
          myProfile: {
            displayName: me?.display_name ?? 'You',
            role: me?.role ?? '',
            bio: me?.bio ?? '',
          },
          theirProfile: {
            displayName: them?.display_name ?? 'Collaborator',
            role: them?.role ?? '',
            bio: them?.bio ?? '',
          },
          pairs,
        })
      }
    )

    await supabaseAdmin.from('matches').upsert(
      {
        user_id_1: req.userId,
        user_id_2: otherUserId,
        similarity_score: projectPairs[0]?.similarity ?? 0,
        matched_nodes: projectPairs,
        insights,
        insights_fingerprint: insightsFp,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id_1,user_id_2' }
    )

    res.json({ ...(insights as MatchInsights), cached: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate match insights'
    console.error('Match insights error:', err)
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Failed to generate match insights' : message,
    })
  }
})

// Update match status (connect / dismiss)
router.patch('/:matchId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body
  if (!['connected', 'dismissed', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  const { data, error } = await req.supabase!
    .from('matches')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.matchId)
    .or(`user_id_1.eq.${req.userId},user_id_2.eq.${req.userId}`)
    .select()
    .single()

  if (error) { res.status(400).json({ error: error.message }); return }
  res.json(data)
})

// Get existing saved matches (pending only, UserMatch shape)
router.get('/saved', async (req: AuthRequest, res: Response): Promise<void> => {
  const matches = await loadCachedMatches(req.userId!)
  res.json({ matches, cached: true })
})

export default router
