import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { analyzeRepoForTeam, analyzeIdeaForTeam } from '../services/teamAnalysis'
import { RecommendedRole } from '../types'

const router = Router()
router.use(authMiddleware)

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

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

export default router
