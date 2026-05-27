import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { analyzeRepoForTeam, analyzeIdeaForTeam } from '../services/teamAnalysis'
import { RecommendedRole } from '../types'
import { normalizePair } from '../services/connectionState'
import { createNode } from '../services/graph'

const router = Router()
router.use(authMiddleware)

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'CoFoundry-App',
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }
}

function slugifyRepoName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'cofoundry-project'
}

async function getRootNodeId(userId: string): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from('nodes')
    .select('id')
    .eq('user_id', userId)
    .eq('is_root', true)
    .single()
  return data?.id
}

async function inviteGitHubRepoCollaborator(params: {
  ownerToken: string
  repoFullName: string
  username: string
  permission?: 'pull' | 'push' | 'admin' | 'maintain' | 'triage'
}): Promise<void> {
  const repo = params.repoFullName.trim()
  const user = params.username.trim().replace(/^@/, '')
  if (!repo || !user) return

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(user)}`,
    {
      method: 'PUT',
      headers: githubHeaders(params.ownerToken),
      body: JSON.stringify({ permission: params.permission ?? 'push' }),
    }
  )

  // GitHub returns 201 (invited) or 204 (already a collaborator)
  if (res.status === 201 || res.status === 204) return

  let errBody: unknown = null
  try { errBody = await res.json() } catch { /* ignore */ }
  const message =
    typeof errBody === 'object' && errBody && 'message' in errBody
      ? String((errBody as Record<string, unknown>).message)
      : `GitHub collaborator invite failed: ${res.status}`
  throw new Error(message)
}

// POST /api/team/analyze/:nodeId  (GitHub repo → LLM team-gap analysis)
router.post('/analyze/:nodeId', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const nodeId = req.params.nodeId

  const { data: node, error: nodeError } = await supabaseAdmin
    .from('nodes')
    .select('id, user_id, title, content, summary, metadata')
    .eq('id', nodeId)
    .eq('user_id', userId)
    .single()

  if (nodeError || !node) {
    res.status(404).json({ error: 'Node not found or access denied' })
    return
  }

  const { data: cached } = await supabaseAdmin
    .from('team_analyses')
    .select('*')
    .eq('node_id', nodeId)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.created_at).getTime()
    if (age < CACHE_TTL_MS) { res.json(cached); return }
    await supabaseAdmin.from('team_analyses').delete().eq('node_id', nodeId)
  }

  try {
    const result = await analyzeRepoForTeam({
      title: node.title,
      content: node.content,
      summary: node.summary,
      metadata: (node.metadata as Record<string, unknown>) ?? {},
    })

    const { data: analysis, error: insertError } = await supabaseAdmin
      .from('team_analyses')
      .insert({
        node_id: nodeId,
        owner_id: userId,
        project_summary: result.project_summary,
        target_market: result.target_market,
        project_stage: result.project_stage,
        recommended_roles: result.recommended_roles,
      })
      .select()
      .single()

    if (insertError) { res.status(500).json({ error: insertError.message }); return }
    res.json(analysis)
  } catch (err) {
    console.error('Team analysis error:', err)
    res.status(500).json({ error: 'Failed to analyze project' })
  }
})

// GET /api/team/collaborators?role=&industries=&commitment=&page=
router.get('/collaborators', async (req: AuthRequest, res: Response): Promise<void> => {
  const role = String(req.query.role ?? '').trim()
  const industriesParam = String(req.query.industries ?? '').trim()
  const commitment = String(req.query.commitment ?? '').trim()
  const page = Math.max(0, Number(req.query.page ?? 0))
  const pageSize = 12
  const userId = req.userId!

  if (!role) {
    res.status(400).json({ error: 'role is required' })
    return
  }

  const { data: existingRequests } = await supabaseAdmin
    .from('team_requests')
    .select('to_user_id, from_user_id')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .in('status', ['pending', 'accepted'])

  const excludedIds = new Set<string>([userId])
  for (const r of existingRequests ?? []) {
    excludedIds.add(r.to_user_id)
    excludedIds.add(r.from_user_id)
  }

  let query = supabaseAdmin
    .from('expertise_profiles')
    .select(`
      id, user_id, headline, expertise_tags, industries, linkedin_url, portfolio_url,
      skills_description, looking_for, commitment, open_to_equity,
      profiles!inner(id, display_name, avatar_url, username)
    `)
    .contains('expertise_tags', [role])
    .not('user_id', 'in', `(${Array.from(excludedIds).join(',')})`)
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (industriesParam) {
    const industries = industriesParam.split(',').filter(Boolean)
    if (industries.length) query = query.overlaps('industries', industries)
  }
  if (commitment) query = query.eq('commitment', commitment)

  const { data, error } = await query
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ collaborators: data ?? [], page, pageSize })
})

// GET /api/team/projects?role=&stage=&source=github|idea&page=
router.get('/projects', async (req: AuthRequest, res: Response): Promise<void> => {
  const role = String(req.query.role ?? '').trim()
  const stage = String(req.query.stage ?? '').trim()
  const source = String(req.query.source ?? '').trim() // 'github' | 'idea' | ''
  const page = Math.max(0, Number(req.query.page ?? 0))
  const pageSize = 12
  const userId = req.userId!
  const fetchLimit = pageSize * 3

  const includeGithub = !source || source === 'github'
  const includeIdea = !source || source === 'idea'

  const [githubResult, ideaResult] = await Promise.all([
    includeGithub
      ? supabaseAdmin
          .from('team_analyses')
          .select(`
            id, node_id, project_summary, target_market, project_stage, recommended_roles, created_at,
            nodes!inner(id, title, user_id),
            profiles!owner_id(id, display_name, avatar_url, username)
          `)
          .neq('owner_id', userId)
          .order('created_at', { ascending: false })
          .limit(fetchLimit)
      : Promise.resolve({ data: [], error: null }),

    includeIdea
      ? supabaseAdmin
          .from('project_ideas')
          .select(`
            id, title, project_summary, target_market, stage, recommended_roles, analysis_at, created_at,
            profiles!user_id(id, display_name, avatar_url, username)
          `)
          .eq('status', 'active')
          .not('analysis_at', 'is', null)
          .neq('user_id', userId)
          .order('analysis_at', { ascending: false })
          .limit(fetchLimit)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (githubResult.error || ideaResult.error) {
    res.status(500).json({ error: githubResult.error?.message ?? ideaResult.error?.message })
    return
  }

  type MappedProject = {
    id: string
    source: 'github' | 'idea'
    node_id: string | null
    idea_id: string | null
    title: string
    project_summary: string
    target_market: string
    project_stage: 'idea' | 'prototype' | 'launched' | 'growing'
    recommended_roles: RecommendedRole[]
    created_at: string
    nodes: Record<string, unknown> | null
    profiles: Record<string, unknown> | null
  }

  const github: MappedProject[] = (githubResult.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    source: 'github',
    node_id: p.node_id as string,
    idea_id: null,
    title: ((p.nodes as Record<string, string>)?.title ?? 'Untitled'),
    project_summary: p.project_summary as string,
    target_market: p.target_market as string,
    project_stage: p.project_stage as 'idea' | 'prototype' | 'launched' | 'growing',
    recommended_roles: (p.recommended_roles as RecommendedRole[]) ?? [],
    created_at: p.created_at as string,
    nodes: p.nodes as Record<string, unknown>,
    profiles: p.profiles as Record<string, unknown>,
  }))

  const ideas: MappedProject[] = (ideaResult.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    source: 'idea',
    node_id: null,
    idea_id: p.id as string,
    title: p.title as string,
    project_summary: (p.project_summary as string) ?? '',
    target_market: (p.target_market as string) ?? '',
    project_stage: p.stage as 'idea' | 'prototype' | 'launched' | 'growing',
    recommended_roles: ((p.recommended_roles as RecommendedRole[]) ?? []),
    created_at: (p.analysis_at as string) ?? (p.created_at as string),
    nodes: null,
    profiles: p.profiles as Record<string, unknown>,
  }))

  let all = [...github, ...ideas].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  if (role) all = all.filter(p => (p.recommended_roles as Array<{ role: string }>).some(r => r.role === role))
  if (stage) all = all.filter(p => p.project_stage === stage)

  res.json({ projects: all.slice(page * pageSize, (page + 1) * pageSize), page, pageSize })
})

// ── Project Ideas CRUD ──────────────────────────────────────────────────────

// GET /api/team/ideas/mine
router.get('/ideas/mine', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { data, error } = await supabaseAdmin
    .from('project_ideas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ideas: data ?? [] })
})

// GET /api/team/ideas/accessible
// Returns projects the user owns, is a member of, or has a pending invite for.
router.get('/ideas/accessible', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!

  const [ownedResult, memberResult, inviteResult] = await Promise.all([
    supabaseAdmin
      .from('project_ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('project_members')
      .select('idea_id, is_owner')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('idea_id', 'is', null),

    supabaseAdmin
      .from('team_requests')
      .select('id, idea_id')
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .not('idea_id', 'is', null),
  ])

  if (ownedResult.error || memberResult.error || inviteResult.error) {
    res.status(500).json({ error: ownedResult.error?.message ?? memberResult.error?.message ?? inviteResult.error?.message })
    return
  }

  const owned = ownedResult.data ?? []
  const ownedIds = new Set<string>(owned.map(i => i.id))

  const memberRows = (memberResult.data ?? []) as Array<{ idea_id: string; is_owner?: boolean }>
  const memberIdeaIds = Array.from(new Set(memberRows.map(r => r.idea_id).filter(Boolean) as string[]))
    .filter(id => !ownedIds.has(id))

  const memberOwnerIdeaIds = new Set(
    memberRows.filter(r => !!r.is_owner).map(r => r.idea_id).filter(Boolean)
  )

  const invites = (inviteResult.data ?? []) as Array<{ id: string; idea_id: string }>
  const invitedByIdeaId = new Map(invites.map(i => [i.idea_id, i.id]))
  const invitedIdeaIds = Array.from(invitedByIdeaId.keys()).filter(id => !ownedIds.has(id))

  const otherIds = Array.from(new Set([...memberIdeaIds, ...invitedIdeaIds]))
  const { data: others, error: othersError } = otherIds.length
    ? await supabaseAdmin.from('project_ideas').select('*').in('id', otherIds)
    : { data: [], error: null }

  if (othersError) { res.status(500).json({ error: othersError.message }); return }

  const merged = [
    ...owned.map(i => ({ ...i, access: 'owner', pending_team_request_id: null })),
    ...(others ?? []).map(i => ({
      ...i,
      access: invitedByIdeaId.has(i.id) ? 'invited_pending' : (memberOwnerIdeaIds.has(i.id) ? 'owner' : 'member'),
      pending_team_request_id: invitedByIdeaId.get(i.id) ?? null,
    })),
  ]

  // stable sort: owned first by created_at, then others by created_at
  merged.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  res.json({ ideas: merged })
})

// POST /api/team/ideas
router.post('/ideas', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { title, problem_statement, solution_description, target_market, stage, skills_i_bring, node_id } = req.body as {
    title?: string
    problem_statement?: string
    solution_description?: string
    target_market?: string
    stage?: string
    skills_i_bring?: string
    node_id?: string
  }

  if (!title?.trim() || !problem_statement?.trim()) {
    res.status(400).json({ error: 'title and problem_statement are required' })
    return
  }

  // If node_id provided, verify ownership
  if (node_id) {
    const { error: nodeError } = await supabaseAdmin
      .from('nodes').select('id').eq('id', node_id).eq('user_id', userId).single()
    if (nodeError) { res.status(403).json({ error: 'GitHub repo not found or access denied' }); return }
  }

  const { data, error } = await supabaseAdmin
    .from('project_ideas')
    .insert({
      user_id: userId,
      title: title.trim(),
      problem_statement: problem_statement.trim(),
      solution_description: solution_description?.trim() || null,
      target_market: target_market?.trim() || null,
      stage: stage || 'idea',
      skills_i_bring: skills_i_bring?.trim() || null,
      node_id: node_id || null,
    })
    .select()
    .single()

  if (error) { res.status(400).json({ error: error.message }); return }
  res.status(201).json(data)
})

// PUT /api/team/ideas/:id
router.put('/ideas/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { title, problem_statement, solution_description, target_market, stage, skills_i_bring, status, node_id } = req.body as Record<string, string | undefined | null>

  // If node_id is being changed, verify ownership
  if (node_id) {
    const { error: nodeError } = await supabaseAdmin
      .from('nodes').select('id').eq('id', node_id).eq('user_id', userId).single()
    if (nodeError) { res.status(403).json({ error: 'GitHub repo not found or access denied' }); return }
  }

  const { data, error } = await supabaseAdmin
    .from('project_ideas')
    .update({
      ...(title && { title: (title as string).trim() }),
      ...(problem_statement && { problem_statement: (problem_statement as string).trim() }),
      solution_description: (solution_description as string | undefined)?.trim() || null,
      target_market: (target_market as string | undefined)?.trim() || null,
      ...(stage && { stage }),
      skills_i_bring: (skills_i_bring as string | undefined)?.trim() || null,
      ...(status && { status }),
      ...('node_id' in req.body && { node_id: node_id || null }),
    })
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !data) { res.status(404).json({ error: 'Idea not found or access denied' }); return }
  res.json(data)
})

// DELETE /api/team/ideas/:id
router.delete('/ideas/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { error } = await supabaseAdmin
    .from('project_ideas')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', userId)

  if (error) { res.status(404).json({ error: 'Idea not found' }); return }
  res.status(204).send()
})

// POST /api/team/ideas/:id/analyze  (LLM analysis of a project idea)
router.post('/ideas/:id/analyze', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!

  const { data: idea, error: ideaError } = await supabaseAdmin
    .from('project_ideas')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .single()

  if (ideaError || !idea) {
    res.status(404).json({ error: 'Idea not found or access denied' })
    return
  }

  // 7-day cache
  if (idea.analysis_at) {
    const age = Date.now() - new Date(idea.analysis_at).getTime()
    if (age < CACHE_TTL_MS) { res.json(idea); return }
  }

  try {
    // Optionally enrich with attached GitHub node
    let nodeData: { title: string; summary: string | null; metadata: Record<string, unknown> } | undefined
    if (idea.node_id) {
      const { data: node } = await supabaseAdmin
        .from('nodes')
        .select('title, summary, metadata')
        .eq('id', idea.node_id)
        .single()
      if (node) nodeData = { title: node.title, summary: node.summary, metadata: (node.metadata as Record<string, unknown>) ?? {} }
    }

    const result = await analyzeIdeaForTeam({
      title: idea.title,
      problem_statement: idea.problem_statement,
      solution_description: idea.solution_description,
      target_market: idea.target_market,
      stage: idea.stage,
      skills_i_bring: idea.skills_i_bring,
      node: nodeData,
    })

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('project_ideas')
      .update({
        project_summary: result.project_summary,
        recommended_roles: result.recommended_roles,
        analysis_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (updateError) { res.status(500).json({ error: updateError.message }); return }
    res.json(updated)
  } catch (err) {
    console.error('Idea analysis error:', err)
    res.status(500).json({ error: 'Failed to analyze idea' })
  }
})

// ── Team Requests ───────────────────────────────────────────────────────────

// POST /api/team/requests  (node_id OR idea_id required)
router.post('/requests', async (req: AuthRequest, res: Response): Promise<void> => {
  const { to_user_id, node_id, idea_id, role, message, direction } = req.body as {
    to_user_id?: string
    node_id?: string
    idea_id?: string
    role?: string
    message?: string
    direction?: string
  }
  const fromUserId = req.userId!

  if (!to_user_id || !role || !direction || (!node_id && !idea_id)) {
    res.status(400).json({ error: 'to_user_id, role, direction, and node_id or idea_id are required' })
    return
  }
  if (to_user_id === fromUserId) {
    res.status(400).json({ error: 'Cannot send a request to yourself' })
    return
  }

  const requestPayload = {
    from_user_id: fromUserId,
    to_user_id,
    node_id: node_id ?? null,
    idea_id: idea_id ?? null,
    role,
    message: message ?? null,
    direction,
    status: 'pending',
  }

  if (idea_id) {
    // For idea-based requests: manual upsert (partial unique index can't be used with onConflict)
    const { data: existing } = await supabaseAdmin
      .from('team_requests')
      .select('id')
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', to_user_id)
      .eq('idea_id', idea_id)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('team_requests')
        .update({ status: 'pending', message: message ?? null })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) { res.status(400).json({ error: error.message }); return }
      res.json(data)
      return
    }

    const { data, error } = await supabaseAdmin
      .from('team_requests')
      .insert(requestPayload)
      .select()
      .single()
    if (error) { res.status(400).json({ error: error.message }); return }
    res.status(201).json(data)
    return
  }

  // Node-based request: use upsert with existing unique constraint
  const { data, error } = await supabaseAdmin
    .from('team_requests')
    .upsert(requestPayload, { onConflict: 'from_user_id,to_user_id,node_id' })
    .select()
    .single()

  if (error) { res.status(400).json({ error: error.message }); return }
  res.status(201).json(data)
})

// PATCH /api/team/requests/:id
router.patch('/requests/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { status } = req.body as { status?: 'accepted' | 'declined' }

  if (!status || !['accepted', 'declined'].includes(status)) {
    res.status(400).json({ error: 'status must be accepted or declined' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('team_requests')
    .update({ status })
    .eq('id', req.params.id)
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .select()
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Request not found or cannot be updated' })
    return
  }

  // Side-effects on accept: connect users, add to project, invite to GitHub repo (best-effort)
  if (status === 'accepted') {
    const fromUserId = data.from_user_id as string
    const toUserId = data.to_user_id as string

    // 1) Upsert connection (idempotent)
    try {
      const pair = normalizePair(fromUserId, toUserId)
      await supabaseAdmin.from('connections').upsert(pair, { onConflict: 'user_id_1,user_id_2' })
    } catch (err) {
      console.warn('Failed to upsert connection from team request accept:', err)
    }

    // 2) Upsert project membership (idea_id or node_id)
    try {
      const ideaId = data.idea_id as string | null
      const nodeId = data.node_id as string | null
      const role = data.role as string

      if (ideaId || nodeId) {
        const existing = ideaId
          ? await supabaseAdmin
              .from('project_members')
              .select('id')
              .eq('idea_id', ideaId)
              .eq('user_id', toUserId)
              .maybeSingle()
          : await supabaseAdmin
              .from('project_members')
              .select('id')
              .eq('node_id', nodeId!)
              .eq('user_id', toUserId)
              .maybeSingle()

        if (existing.data?.id) {
          await supabaseAdmin
            .from('project_members')
            .update({ status: 'active', role, added_by_user_id: fromUserId })
            .eq('id', existing.data.id)
        } else {
          await supabaseAdmin
            .from('project_members')
            .insert({
              idea_id: ideaId ?? null,
              node_id: nodeId ?? null,
              user_id: toUserId,
              added_by_user_id: fromUserId,
              role,
              status: 'active',
            })
        }
      }
    } catch (err) {
      console.warn('Failed to upsert project member from team request accept:', err)
    }

    // 3) GitHub repo collaborator invite
    try {
      // Resolve repo node id (direct node_id OR idea.node_id)
      let repoNodeId: string | null = (data.node_id as string | null) ?? null
      const ideaId = data.idea_id as string | null

      if (!repoNodeId && ideaId) {
        const { data: idea } = await supabaseAdmin
          .from('project_ideas')
          .select('node_id')
          .eq('id', ideaId)
          .single()
        repoNodeId = (idea?.node_id as string | null) ?? null
      }

      if (!repoNodeId) {
        // no linked GitHub repo
        res.json(data)
        return
      }

      const [{ data: node }, { data: ownerGh }, { data: acceptorGh }] = await Promise.all([
        supabaseAdmin.from('nodes').select('metadata').eq('id', repoNodeId).single(),
        supabaseAdmin
          .from('integrations')
          .select('access_token')
          .eq('user_id', fromUserId)
          .eq('provider', 'github')
          .maybeSingle(),
        supabaseAdmin
          .from('integrations')
          .select('provider_username')
          .eq('user_id', toUserId)
          .eq('provider', 'github')
          .maybeSingle(),
      ])

      const repoFullName =
        ((node?.metadata as { github?: { full_name?: string } })?.github?.full_name ?? '').trim()
      const ownerToken = (ownerGh?.access_token ?? '').trim()
      const username = (acceptorGh?.provider_username ?? '').trim()

      if (repoFullName && ownerToken && username) {
        await inviteGitHubRepoCollaborator({
          ownerToken,
          repoFullName,
          username,
          permission: 'push',
        })
      }
    } catch (err) {
      console.warn('Failed to invite GitHub collaborator from team request accept:', err)
    }
  }

  res.json(data)
})

// DELETE /api/team/requests/:id  (cancel)
router.delete('/requests/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { error } = await supabaseAdmin
    .from('team_requests')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .eq('from_user_id', userId)
    .eq('status', 'pending')

  if (error) { res.status(404).json({ error: 'Request not found' }); return }
  res.status(204).send()
})

// GET /api/team/requests
router.get('/requests', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!

  const { data, error } = await supabaseAdmin
    .from('team_requests')
    .select(`
      id, role, message, status, direction, created_at, updated_at,
      node_id, idea_id,
      nodes(id, title),
      project_ideas(id, title),
      from_profile:profiles!from_user_id(id, display_name, avatar_url, username),
      to_profile:profiles!to_user_id(id, display_name, avatar_url, username)
    `)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }

  const rows = data ?? []
  res.json({
    sent: rows.filter((r: Record<string, unknown>) => r.from_profile && (r.from_profile as Record<string, string>).id === userId),
    received: rows.filter((r: Record<string, unknown>) => r.to_profile && (r.to_profile as Record<string, string>).id === userId),
  })
})

// GET /api/team/members?idea_id= OR node_id=
router.get('/members', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const ideaId = typeof req.query.idea_id === 'string' ? req.query.idea_id.trim() : ''
  const nodeId = typeof req.query.node_id === 'string' ? req.query.node_id.trim() : ''

  if ((!ideaId && !nodeId) || (ideaId && nodeId)) {
    res.status(400).json({ error: 'Provide exactly one of idea_id or node_id' })
    return
  }

  // Authorize: owner OR active member can list members
  if (ideaId) {
    const { data: idea, error: ideaErr } = await supabaseAdmin
      .from('project_ideas')
      .select('id, user_id')
      .eq('id', ideaId)
      .single()
    if (ideaErr || !idea) { res.status(404).json({ error: 'Project not found' }); return }

    if (idea.user_id !== userId) {
      const { data: memberRow } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('idea_id', ideaId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()
      if (!memberRow) { res.status(403).json({ error: 'Access denied' }); return }
    }

    const query = supabaseAdmin
      .from('project_members')
      .select(`
        id, idea_id, node_id, user_id, added_by_user_id, role, status, is_owner, created_at, updated_at,
        profile:profiles!user_id(id, display_name, avatar_url, username, role)
      `)
      .eq('idea_id', ideaId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    const [{ data, error }, { data: ownerProfile }] = await Promise.all([
      query,
      supabaseAdmin.from('profiles').select('id, display_name, avatar_url, username, role').eq('id', idea.user_id).single(),
    ])

    if (error) { res.status(500).json({ error: error.message }); return }

    // Include the project owner as a member entry (even if they aren't in project_members)
    const ownerEntry = {
      id: `owner:${idea.user_id}`,
      idea_id: ideaId,
      node_id: null,
      user_id: idea.user_id,
      added_by_user_id: null,
      role: (ownerProfile?.role as string | null) ?? 'Owner',
      status: 'active',
      is_owner: true,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      profile: ownerProfile ?? null,
    }

    const rows = (data ?? []) as any[]
    const hasOwnerRow = rows.some(r => r.user_id === idea.user_id)
    const out = hasOwnerRow ? rows.map(r => (r.user_id === idea.user_id ? { ...r, is_owner: true } : r)) : [ownerEntry, ...rows]

    res.json({ members: out })
    return
  }

  // node_id projects: keep owner-only for now (BuildTeam uses idea-based projects)
  if (nodeId) {
    const { data: node, error: nodeErr } = await supabaseAdmin
      .from('nodes')
      .select('id, user_id')
      .eq('id', nodeId)
      .single()
    if (nodeErr || !node) { res.status(404).json({ error: 'Project not found' }); return }
    if (node.user_id !== userId) { res.status(403).json({ error: 'Access denied' }); return }
  }

  const query = supabaseAdmin
    .from('project_members')
    .select(`
      id, idea_id, node_id, user_id, added_by_user_id, role, status, is_owner, created_at, updated_at,
      profile:profiles!user_id(id, display_name, avatar_url, username, role)
    `)
    .order('created_at', { ascending: true })

  const { data, error } = await query.eq('node_id', nodeId).eq('status', 'active')
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ members: data ?? [] })
})

// DELETE /api/team/members/:id
// Owner-only: remove a member from a project (sets status='removed')
router.delete('/members/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const memberId = req.params.id

  const { data: member, error: memberErr } = await supabaseAdmin
    .from('project_members')
    .select('id, idea_id, node_id, user_id, status')
    .eq('id', memberId)
    .single()

  if (memberErr || !member) { res.status(404).json({ error: 'Member not found' }); return }
  if (member.status !== 'active') { res.status(400).json({ error: 'Member is not active' }); return }

  // Authorize: only owner of the underlying project (creator OR delegated owner)
  if (member.idea_id) {
    const { data: idea, error: ideaErr } = await supabaseAdmin
      .from('project_ideas')
      .select('id, user_id')
      .eq('id', member.idea_id)
      .single()
    if (ideaErr || !idea) { res.status(404).json({ error: 'Project not found' }); return }
    if (member.user_id === idea.user_id) {
      res.status(400).json({ error: 'Cannot remove the project creator' })
      return
    }

    if (idea.user_id !== userId) {
      const { data: ownerRow } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('idea_id', member.idea_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('is_owner', true)
        .maybeSingle()
      if (!ownerRow) { res.status(403).json({ error: 'Access denied' }); return }
    }
  } else if (member.node_id) {
    const { data: node, error: nodeErr } = await supabaseAdmin
      .from('nodes')
      .select('id, user_id')
      .eq('id', member.node_id)
      .single()
    if (nodeErr || !node) { res.status(404).json({ error: 'Project not found' }); return }
    if (node.user_id !== userId) { res.status(403).json({ error: 'Access denied' }); return }
  } else {
    res.status(400).json({ error: 'Member is not associated with a project' })
    return
  }

  if (member.user_id === userId) {
    res.status(400).json({ error: 'Owners cannot remove themselves' })
    return
  }

  const { error: updateErr } = await supabaseAdmin
    .from('project_members')
    .update({ status: 'removed' })
    .eq('id', memberId)

  if (updateErr) { res.status(500).json({ error: updateErr.message }); return }
  res.status(204).send()
})

// PATCH /api/team/members/:id/owner
// Owner-only: promote/demote another member to delegated owner
router.patch('/members/:id/owner', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const memberId = req.params.id
  const { is_owner } = req.body as { is_owner?: boolean }

  if (typeof is_owner !== 'boolean') {
    res.status(400).json({ error: 'is_owner must be boolean' })
    return
  }

  const { data: member, error: memberErr } = await supabaseAdmin
    .from('project_members')
    .select('id, idea_id, node_id, user_id, status')
    .eq('id', memberId)
    .single()

  if (memberErr || !member) { res.status(404).json({ error: 'Member not found' }); return }
  if (member.status !== 'active') { res.status(400).json({ error: 'Member is not active' }); return }

  // Only idea-based projects supported for delegated owners
  if (!member.idea_id) {
    res.status(400).json({ error: 'Delegated owners only supported for idea-based projects' })
    return
  }

  const { data: idea, error: ideaErr } = await supabaseAdmin
    .from('project_ideas')
    .select('id, user_id')
    .eq('id', member.idea_id)
    .single()

  if (ideaErr || !idea) { res.status(404).json({ error: 'Project not found' }); return }

  // Caller must be creator OR delegated owner
  if (idea.user_id !== userId) {
    const { data: ownerRow } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('idea_id', member.idea_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_owner', true)
      .maybeSingle()
    if (!ownerRow) { res.status(403).json({ error: 'Access denied' }); return }
  }

  if (member.user_id === idea.user_id) {
    res.status(400).json({ error: 'Cannot change owner flag for the project creator' })
    return
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('project_members')
    .update({ is_owner })
    .eq('id', memberId)
    .select(`
      id, idea_id, node_id, user_id, added_by_user_id, role, status, is_owner, created_at, updated_at,
      profile:profiles!user_id(id, display_name, avatar_url, username, role)
    `)
    .single()

  if (updateErr || !updated) { res.status(500).json({ error: updateErr?.message ?? 'Failed to update' }); return }
  res.json(updated)
})

// POST /api/team/ideas/:id/github-repo
// Owner-only: create a GitHub repo for this project and link it.
router.post('/ideas/:id/github-repo', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const ideaId = req.params.id

  const { data: idea, error: ideaErr } = await supabaseAdmin
    .from('project_ideas')
    .select('id, user_id, title, node_id')
    .eq('id', ideaId)
    .single()

  if (ideaErr || !idea) { res.status(404).json({ error: 'Project not found' }); return }

  // Authorize: creator OR delegated owner
  if (idea.user_id !== userId) {
    const { data: ownerRow } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('idea_id', ideaId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_owner', true)
      .maybeSingle()
    if (!ownerRow) { res.status(403).json({ error: 'Access denied' }); return }
  }

  if (idea.node_id) {
    res.status(400).json({ error: 'Project already linked to a GitHub repo' })
    return
  }

  const { data: gh, error: ghErr } = await supabaseAdmin
    .from('integrations')
    .select('access_token, provider_username, metadata')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .maybeSingle()

  const token = (gh?.access_token ?? '').trim()
  const username = (gh?.provider_username ?? '').trim()
  if (ghErr || !token || !username) {
    res.status(400).json({ error: 'GitHub not connected' })
    return
  }

  // Create repo on GitHub (public by default; adjust if you want private).
  const repoName = slugifyRepoName(idea.title)
  const createRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({
      name: repoName,
      private: false,
      auto_init: true,
      description: `CoFoundry project: ${idea.title}`,
    }),
  })

  const created = await createRes.json().catch(() => null) as any
  if (!createRes.ok) {
    const msg = created?.message ? String(created.message) : 'Failed to create repo'
    res.status(400).json({ error: msg })
    return
  }

  const fullName = String(created?.full_name ?? `${username}/${repoName}`)
  const htmlUrl = String(created?.html_url ?? '')

  // Ensure the new repo becomes "selected" for integrations UX.
  try {
    const priorMeta = (gh?.metadata ?? {}) as Record<string, unknown>
    const selected = new Set<string>(Array.isArray((priorMeta as any).selectedRepoFullNames) ? (priorMeta as any).selectedRepoFullNames : [])
    selected.add(fullName)

    const repos = Array.isArray((priorMeta as any).repos) ? (priorMeta as any).repos : []
    const hasRepo = repos.some((r: any) => String(r?.full_name ?? '') === fullName)
    const nextRepos = hasRepo
      ? repos
      : [
          ...repos,
          {
            id: created?.id,
            name: created?.name ?? repoName,
            full_name: fullName,
            description: created?.description ?? null,
            language: created?.language ?? null,
            html_url: htmlUrl,
            stargazers_count: created?.stargazers_count ?? 0,
            updated_at: created?.updated_at ?? new Date().toISOString(),
            topics: created?.topics ?? [],
          },
        ]

    await supabaseAdmin
      .from('integrations')
      .update({
        metadata: {
          ...priorMeta,
          repos: nextRepos,
          selectedRepoFullNames: Array.from(selected),
          synced_at: new Date().toISOString(),
        },
      })
      .eq('user_id', userId)
      .eq('provider', 'github')
  } catch (err) {
    console.warn('Failed to update GitHub integration selection after repo create:', err)
  }

  // Create a corresponding project node in the graph for the owner.
  const rootId = await getRootNodeId(userId)
  const node = await createNode(userId, {
    type: 'project',
    title: repoName,
    content: `## Overview\nRepository: ${fullName}\n\n## Links\nURL: ${htmlUrl}`.trim(),
    summary: (created?.description as string) ?? `GitHub repository: ${fullName}`,
    parentId: rootId,
    metadata: {
      source: 'github',
      github: {
        full_name: fullName,
        html_url: htmlUrl,
      },
    },
  })

  const { data: updatedIdea, error: updateErr } = await supabaseAdmin
    .from('project_ideas')
    .update({ node_id: node.id })
    .eq('id', ideaId)
    .select('*')
    .single()

  if (updateErr || !updatedIdea) {
    res.status(500).json({ error: updateErr?.message ?? 'Failed to link repo' })
    return
  }

  res.status(201).json({ idea: updatedIdea, node, repo: { full_name: fullName, html_url: htmlUrl } })
})

// ── Project group chat ──────────────────────────────────────────────────────

// GET /api/team/chat/messages?idea_id=
router.get('/chat/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const ideaId = typeof req.query.idea_id === 'string' ? req.query.idea_id.trim() : ''
  if (!ideaId) { res.status(400).json({ error: 'idea_id is required' }); return }

  // Authorize: owner or active member
  const { data: idea, error: ideaErr } = await supabaseAdmin
    .from('project_ideas')
    .select('id, user_id')
    .eq('id', ideaId)
    .single()
  if (ideaErr || !idea) { res.status(404).json({ error: 'Project not found' }); return }

  if (idea.user_id !== userId) {
    const { data: memberRow } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('idea_id', ideaId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (!memberRow) { res.status(403).json({ error: 'Access denied' }); return }
  }

  const { data, error } = await supabaseAdmin
    .from('project_chat_messages')
    .select(`
      id, idea_id, sender_id, body, created_at,
      sender:profiles!sender_id(id, display_name, avatar_url, username)
    `)
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: true })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ messages: data ?? [] })
})

// POST /api/team/chat/messages
router.post('/chat/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { idea_id, body } = req.body as { idea_id?: string; body?: string }
  const ideaId = (idea_id ?? '').trim()
  const text = (body ?? '').trim()
  if (!ideaId) { res.status(400).json({ error: 'idea_id is required' }); return }
  if (!text) { res.status(400).json({ error: 'body is required' }); return }
  if (text.length > 2000) { res.status(400).json({ error: 'body too long' }); return }

  // Authorize: owner or active member
  const { data: idea, error: ideaErr } = await supabaseAdmin
    .from('project_ideas')
    .select('id, user_id')
    .eq('id', ideaId)
    .single()
  if (ideaErr || !idea) { res.status(404).json({ error: 'Project not found' }); return }

  if (idea.user_id !== userId) {
    const { data: memberRow } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('idea_id', ideaId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (!memberRow) { res.status(403).json({ error: 'Access denied' }); return }
  }

  const { data, error } = await supabaseAdmin
    .from('project_chat_messages')
    .insert({ idea_id: ideaId, sender_id: userId, body: text })
    .select(`
      id, idea_id, sender_id, body, created_at,
      sender:profiles!sender_id(id, display_name, avatar_url, username)
    `)
    .single()

  if (error || !data) { res.status(500).json({ error: error?.message ?? 'Failed to send message' }); return }
  res.status(201).json(data)
})

export default router
