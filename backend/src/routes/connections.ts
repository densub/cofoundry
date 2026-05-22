import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import {
  computePairProjectMatches,
  loadUserProjectGraph,
} from '../services/connectionGraph'
import { getConnectionState, getConnectionStates, normalizePair } from '../services/connectionState'
import { searchPublicGitHubUsers } from '../services/github'
import { sendEmail } from '../services/sendgrid'

const router = Router()
router.use(authMiddleware)

type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

interface ProfileRow {
  id: string
  display_name: string | null
  username: string | null
  role: string | null
  bio: string | null
  avatar_url: string | null
}

async function loadProfiles(ids: string[]): Promise<Map<string, ProfileRow>> {
  if (!ids.length) return new Map()
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, username, role, bio, avatar_url')
    .in('id', Array.from(new Set(ids)))

  return new Map(((data ?? []) as ProfileRow[]).map(profile => [profile.id, profile]))
}

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!

  const [{ data: connections }, { data: requests }, { data: invites }] = await Promise.all([
    supabaseAdmin
      .from('connections')
      .select('id, user_id_1, user_id_2, created_at')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('connection_requests')
      .select('id, requester_id, recipient_id, status, created_at, updated_at')
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('updated_at', { ascending: false }),
    supabaseAdmin
      .from('external_invites')
      .select('id, github_login, github_profile_url, email, status, created_at')
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const connectionRows = connections ?? []
  const requestRows = requests ?? []
  const profileIds = [
    ...connectionRows.map(row => row.user_id_1 === userId ? row.user_id_2 : row.user_id_1),
    ...requestRows.flatMap(row => [row.requester_id, row.recipient_id]),
  ].filter(id => id !== userId)
  const profileById = await loadProfiles(profileIds)

  res.json({
    connections: connectionRows.map(row => {
      const otherUserId = row.user_id_1 === userId ? row.user_id_2 : row.user_id_1
      return { id: row.id, created_at: row.created_at, user: profileById.get(otherUserId) ?? null }
    }),
    incomingRequests: requestRows
      .filter(row => row.recipient_id === userId && row.status === 'pending')
      .map(row => ({ ...row, user: profileById.get(row.requester_id) ?? null })),
    outgoingRequests: requestRows
      .filter(row => row.requester_id === userId && row.status === 'pending')
      .map(row => ({ ...row, user: profileById.get(row.recipient_id) ?? null })),
    externalInvites: invites ?? [],
  })
})

router.get('/network-graph', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const [{ data: me }, { data: directConnections }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, display_name, username, avatar_url, role')
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('connections')
      .select('id, user_id_1, user_id_2')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`),
  ])

  const directIds = Array.from(new Set((directConnections ?? []).map(row =>
    row.user_id_1 === userId ? row.user_id_2 : row.user_id_1
  )))
  const { data: secondDegreeConnections } = directIds.length
    ? await supabaseAdmin
      .from('connections')
      .select('id, user_id_1, user_id_2')
      .or(`user_id_1.in.(${directIds.join(',')}),user_id_2.in.(${directIds.join(',')})`)
    : { data: [] }

  const directSet = new Set(directIds)
  const secondDegreeIds = new Set<string>()
  const links = directIds.map(otherId => ({ source: userId, target: otherId }))

  for (const row of secondDegreeConnections ?? []) {
    const left = row.user_id_1 as string
    const right = row.user_id_2 as string
    const directId = directSet.has(left) ? left : directSet.has(right) ? right : null
    const secondId = directId === left ? right : directId === right ? left : null
    if (!directId || !secondId || secondId === userId) continue
    links.push({ source: directId, target: secondId })
    if (!directSet.has(secondId)) secondDegreeIds.add(secondId)
  }

  const secondDegreeIdList = Array.from(secondDegreeIds)
  const profileById = await loadProfiles([...directIds, ...secondDegreeIdList])

  res.json({
    me: me ?? null,
    connections: directIds.map(id => profileById.get(id) ?? null).filter(Boolean),
    secondDegreeConnections: secondDegreeIdList.map(id => profileById.get(id) ?? null).filter(Boolean),
    links,
  })
})

router.get('/users/:otherUserId/graph', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const otherUserId = String(req.params.otherUserId)

  if (!otherUserId || otherUserId === userId) {
    res.status(400).json({ error: 'Invalid user' })
    return
  }

  const state = await getConnectionState(userId, otherUserId)
  if (state !== 'connected') {
    res.status(403).json({ error: 'You can only view the graph for accepted connections' })
    return
  }

  const [{ data: otherProfile }, { matchedNodes, score }, myGraph, theirGraph] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, display_name, username, role, bio, avatar_url')
      .eq('id', otherUserId)
      .single(),
    computePairProjectMatches(userId, otherUserId),
    loadUserProjectGraph(userId),
    loadUserProjectGraph(otherUserId),
  ])

  const prefix = (id: string) => `other:${id}`
  const theirNodes = theirGraph.nodes.map(n => ({
    ...n,
    id: prefix(n.id),
    parent_id: n.parent_id ? prefix(n.parent_id) : n.parent_id,
  }))
  const theirEdges = theirGraph.edges.map(e => ({
    ...e,
    id: `other:${e.id}`,
    from_node_id: prefix(e.from_node_id),
    to_node_id: prefix(e.to_node_id),
  }))
  const matchEdges = matchedNodes.map((pair, i) => ({
    id: `match:${i}`,
    from_node_id: pair.myNodeId,
    to_node_id: prefix(pair.theirNodeId),
    relationship_type: 'match',
    weight: pair.similarity,
  }))

  res.json({
    user: otherProfile ?? null,
    score,
    matchedNodes,
    my: myGraph,
    their: { nodes: theirNodes, edges: theirEdges },
    matchEdges,
  })
})

router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
  const query = String(req.query.q ?? '').trim()
  if (query.length < 2) {
    res.json({ appUsers: [], githubUsers: [] })
    return
  }

  const userId = req.userId!
  const like = `%${query}%`
  const [{ data: profiles }, { data: integrations }, githubUsers] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, display_name, username, role, bio, avatar_url')
      .neq('id', userId)
      .or(`display_name.ilike.${like},username.ilike.${like},role.ilike.${like},bio.ilike.${like}`)
      .limit(8),
    supabaseAdmin
      .from('integrations')
      .select('user_id, provider_username, metadata')
      .eq('provider', 'github')
      .ilike('provider_username', like)
      .neq('user_id', userId)
      .limit(8),
    searchPublicGitHubUsers(query, 6).catch(() => []),
  ])

  const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map(profile => [profile.id, profile]))
  const missingProfileIds = (integrations ?? [])
    .map(row => row.user_id as string)
    .filter(id => !profileMap.has(id))
  const missingProfiles = await loadProfiles(missingProfileIds)
  for (const [id, profile] of missingProfiles) profileMap.set(id, profile)

  const profileValues = Array.from(profileMap.values())
  const states = await getConnectionStates(userId, profileValues.map(profile => profile.id))
  const appUsers = profileValues.map(profile => ({
      ...profile,
      connectionStatus: states.get(profile.id) ?? null,
      githubUsername: (integrations ?? []).find(row => row.user_id === profile.id)?.provider_username ?? null,
    }))
  const appGithubLogins = new Set(appUsers.map(user => user.githubUsername).filter(Boolean))

  res.json({
    appUsers,
    githubUsers: githubUsers
      .filter(user => !appGithubLogins.has(user.login))
      .map(user => ({
        id: user.id,
        login: user.login,
        name: user.name,
        bio: user.bio,
        email: user.email,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        public_repos: user.public_repos,
      })),
  })
})

router.post('/requests', async (req: AuthRequest, res: Response): Promise<void> => {
  const { recipientId } = req.body as { recipientId?: string }
  const requesterId = req.userId!

  if (!recipientId || recipientId === requesterId) {
    res.status(400).json({ error: 'Invalid recipient' })
    return
  }

  const state = await getConnectionState(requesterId, recipientId)
  if (state === 'connected') { res.status(409).json({ error: 'Already connected' }); return }
  if (state === 'requested') { res.status(409).json({ error: 'Request already sent' }); return }

  if (state === 'incoming') {
    const { data: existing } = await supabaseAdmin
      .from('connection_requests')
      .select('id')
      .eq('requester_id', recipientId)
      .eq('recipient_id', requesterId)
      .eq('status', 'pending')
      .single()
    req.params.id = existing?.id
    await acceptRequest(req, res)
    return
  }

  const { data: reusableRequest, error: reusableError } = await supabaseAdmin
    .from('connection_requests')
    .update({ status: 'pending' as RequestStatus })
    .eq('requester_id', requesterId)
    .eq('recipient_id', recipientId)
    .neq('status', 'pending')
    .select()
    .maybeSingle()

  if (reusableError) {
    res.status(400).json({ error: reusableError.message })
    return
  }
  if (reusableRequest) {
    res.status(201).json(reusableRequest)
    return
  }

  const { data, error } = await supabaseAdmin
    .from('connection_requests')
    .insert({ requester_id: requesterId, recipient_id: recipientId })
    .select()
    .single()

  if (error) { res.status(400).json({ error: error.message }); return }
  res.status(201).json(data)
})

async function acceptRequest(req: AuthRequest, res: Response): Promise<void> {
  const requestId = req.params.id
  const userId = req.userId!

  const { data: request, error } = await supabaseAdmin
    .from('connection_requests')
    .select('id, requester_id, recipient_id, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (error || !request) { res.status(404).json({ error: 'Request not found' }); return }
  if (request.recipient_id !== userId) { res.status(403).json({ error: 'Only the recipient can accept this request' }); return }

  const pair = normalizePair(request.requester_id, request.recipient_id)
  const [{ error: connectionError }, { data: updated, error: updateError }] = await Promise.all([
    supabaseAdmin.from('connections').upsert(pair, { onConflict: 'user_id_1,user_id_2' }),
    supabaseAdmin
      .from('connection_requests')
      .update({ status: 'accepted' as RequestStatus })
      .eq('id', request.id)
      .select()
      .single(),
  ])

  if (connectionError || updateError) {
    res.status(400).json({ error: connectionError?.message ?? updateError?.message })
    return
  }
  res.json(updated)
}

router.post('/requests/:id/accept', acceptRequest)

router.post('/requests/:id/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { data, error } = await supabaseAdmin
    .from('connection_requests')
    .update({ status: 'cancelled' as RequestStatus })
    .eq('id', req.params.id)
    .eq('requester_id', userId)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) { res.status(404).json({ error: 'Request not found' }); return }
  res.json(data)
})

router.delete('/users/:otherUserId', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const otherUserId = String(req.params.otherUserId)

  if (!otherUserId || otherUserId === userId) {
    res.status(400).json({ error: 'Invalid user' })
    return
  }

  const pair = normalizePair(userId, otherUserId)
  const { data: connection, error: connectionError } = await supabaseAdmin
    .from('connections')
    .delete()
    .eq('user_id_1', pair.user_id_1)
    .eq('user_id_2', pair.user_id_2)
    .select('id')
    .maybeSingle()

  if (connectionError) {
    res.status(400).json({ error: connectionError.message })
    return
  }
  if (!connection) {
    res.status(404).json({ error: 'Connection not found' })
    return
  }

  await supabaseAdmin
    .from('connection_requests')
    .update({ status: 'cancelled' as RequestStatus })
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .eq('status', 'accepted')

  res.status(204).send()
})

router.post('/requests/:id/decline', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { data, error } = await supabaseAdmin
    .from('connection_requests')
    .update({ status: 'declined' as RequestStatus })
    .eq('id', req.params.id)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) { res.status(404).json({ error: 'Request not found' }); return }
  res.json(data)
})

router.post('/invites/github', async (req: AuthRequest, res: Response): Promise<void> => {
  const { login, email, profileUrl, name } = req.body as {
    login?: string
    email?: string
    profileUrl?: string
    name?: string | null
  }

  if (!login || !email || !profileUrl) {
    res.status(400).json({ error: 'GitHub login, profile URL, and public email are required' })
    return
  }

  const { data: inviter } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', req.userId)
    .single()

  try {
    const subject = `${inviter?.display_name ?? 'Someone'} invited you to CoFoundry`
    const joinUrl = process.env.FRONTEND_URL ?? 'https://cofoundry.app'
    const text = [
      `Hi ${name ?? login},`,
      '',
      `${inviter?.display_name ?? 'Someone'} found your GitHub profile and invited you to join CoFoundry.`,
      `Join here: ${joinUrl}`,
      '',
      `GitHub profile: ${profileUrl}`,
    ].join('\n')
    const html = `
      <p>Hi ${name ?? login},</p>
      <p>${inviter?.display_name ?? 'Someone'} found your GitHub profile and invited you to join CoFoundry.</p>
      <p><a href="${joinUrl}">Join CoFoundry</a></p>
      <p><a href="${profileUrl}">View your GitHub profile</a></p>
    `
    const messageId = await sendEmail({ to: email, subject, text, html })
    const { data, error } = await supabaseAdmin
      .from('external_invites')
      .upsert(
        {
          inviter_id: req.userId,
          github_login: login,
          github_profile_url: profileUrl,
          email,
          status: 'sent',
          sendgrid_message_id: messageId,
          error_message: null,
        },
        { onConflict: 'inviter_id,github_login' },
      )
      .select()
      .single()

    if (error) { res.status(400).json({ error: error.message }); return }
    res.status(201).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invite failed'
    await supabaseAdmin.from('external_invites').upsert(
      {
        inviter_id: req.userId,
        github_login: login,
        github_profile_url: profileUrl,
        email,
        status: 'failed',
        error_message: message,
      },
      { onConflict: 'inviter_id,github_login' },
    )
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Failed to send invite' : message })
  }
})

export default router
