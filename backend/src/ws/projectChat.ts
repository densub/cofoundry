import type { IncomingMessage } from 'http'
import { WebSocketServer } from 'ws'
import { supabaseAdmin } from '../lib/supabase'
import { draftGitHubIssueFromChat, generateChatInsights } from '../services/cofoundryChatAssistant'

type ChatClient = {
  userId: string
  ideaId: string
}

function getQuery(req: IncomingMessage) {
  const url = req.url ?? ''
  const idx = url.indexOf('?')
  const qs = idx >= 0 ? url.slice(idx + 1) : ''
  return new URLSearchParams(qs)
}

async function authorizeProjectRead(userId: string, ideaId: string) {
  const { data: idea, error: ideaErr } = await supabaseAdmin
    .from('project_ideas')
    .select('id, user_id')
    .eq('id', ideaId)
    .single()

  if (ideaErr || !idea) return { ok: false as const, code: 404 as const, error: 'Project not found' }
  if (idea.user_id === userId) return { ok: true as const }

  const { data: memberRow } = await supabaseAdmin
    .from('project_members')
    .select('id')
    .eq('idea_id', ideaId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!memberRow) return { ok: false as const, code: 403 as const, error: 'Access denied' }
  return { ok: true as const }
}

async function fetchRecentMessages(ideaId: string, limit = 50) {
  // Fetch newest N then reverse for chronological
  const { data, error } = await supabaseAdmin
    .from('project_chat_messages')
    .select(`
      id, idea_id, sender_id, body, created_at,
      sender:profiles!sender_id(id, display_name, avatar_url, username)
    `)
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []).reverse()
}

async function getProjectContextForChat(ideaId: string) {
  const { data: idea } = await supabaseAdmin
    .from('project_ideas')
    .select('id, user_id, title, project_summary, problem_statement, node_id')
    .eq('id', ideaId)
    .single()

  if (!idea) return null

  let repoFullName: string | null = null
  let repoUrl: string | null = null
  if (idea.node_id) {
    const { data: node } = await supabaseAdmin
      .from('nodes')
      .select('metadata')
      .eq('id', idea.node_id)
      .single()
    repoFullName = ((node?.metadata as any)?.github?.full_name ?? null)
    repoUrl = ((node?.metadata as any)?.github?.html_url ?? null)
  }

  const summary =
    (idea.project_summary as string | null) ??
    (idea.problem_statement as string | null) ??
    ''

  return {
    idea,
    repoFullName,
    repoUrl,
    projectTitle: String(idea.title ?? ''),
    projectSummary: String(summary ?? ''),
  }
}

async function createGitHubIssue(params: {
  ownerToken: string
  repoFullName: string
  title: string
  body: string
  labels?: string[]
}) {
  const [owner, repo] = params.repoFullName.split('/')
  if (!owner || !repo) throw new Error('Invalid repo name')

  const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.ownerToken}`,
      'User-Agent': 'CoFoundry-App',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      labels: params.labels?.length ? params.labels : undefined,
    }),
  })

  const json = await res.json().catch(() => null) as any
  if (!res.ok) {
    throw new Error(json?.message ? String(json.message) : `GitHub issue create failed (${res.status})`)
  }
  return { url: String(json.html_url ?? ''), number: json.number as number | undefined }
}

export function attachProjectChatWSServer(server: import('http').Server) {
  const wss = new WebSocketServer({ server, path: '/ws/project-chat' })

  // Track connections by ideaId for broadcast
  const rooms = new Map<string, Set<import('ws').WebSocket>>()
  const clientInfo = new WeakMap<import('ws').WebSocket, ChatClient>()
  const pendingIssueDraft = new Map<string, { repoFullName: string; title: string; body: string; labels?: string[] }>()

  function joinRoom(ws: import('ws').WebSocket, ideaId: string) {
    const set = rooms.get(ideaId) ?? new Set()
    set.add(ws)
    rooms.set(ideaId, set)
  }

  function leaveRooms(ws: import('ws').WebSocket) {
    for (const [, set] of rooms) set.delete(ws)
  }

  function broadcast(ideaId: string, payload: unknown) {
    const set = rooms.get(ideaId)
    if (!set) return
    const msg = JSON.stringify(payload)
    for (const client of set) {
      if (client.readyState === client.OPEN) client.send(msg)
    }
  }

  function sendAI(ws: import('ws').WebSocket, content: string) {
    if (ws.readyState !== ws.OPEN) return
    ws.send(JSON.stringify({
      type: 'ai_message',
      message: {
        id: `ai:${Date.now()}:${Math.random().toString(16).slice(2)}`,
        idea_id: clientInfo.get(ws)?.ideaId ?? '',
        sender_id: 'cofoundry',
        body: content,
        created_at: new Date().toISOString(),
        sender: { id: 'cofoundry', display_name: 'CoFoundry', avatar_url: null, username: 'cofoundry' },
      },
    }))
  }

  wss.on('connection', async (ws, req) => {
    try {
      const q = getQuery(req)
      const token = (q.get('token') ?? '').trim()
      const ideaId = (q.get('idea_id') ?? '').trim()

      if (!token || !ideaId) {
        ws.send(JSON.stringify({ type: 'error', error: 'token and idea_id are required' }))
        ws.close()
        return
      }

      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
      const userId = userData?.user?.id
      if (userErr || !userId) {
        ws.send(JSON.stringify({ type: 'error', error: 'Unauthorized' }))
        ws.close()
        return
      }

      const authz = await authorizeProjectRead(userId, ideaId)
      if (!authz.ok) {
        ws.send(JSON.stringify({ type: 'error', error: authz.error }))
        ws.close()
        return
      }

      clientInfo.set(ws, { userId, ideaId })
      joinRoom(ws, ideaId)

      ws.send(JSON.stringify({ type: 'ready' }))
      ws.send(JSON.stringify({ type: 'history', messages: await fetchRecentMessages(ideaId) }))

      ws.on('message', async raw => {
        let parsed: any
        try {
          parsed = JSON.parse(String(raw))
        } catch {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }))
          return
        }

        if (parsed?.type !== 'send') return
        const body = String(parsed?.body ?? '').trim()
        if (!body) return
        if (body.length > 2000) {
          ws.send(JSON.stringify({ type: 'error', error: 'Message too long' }))
          return
        }

        const info = clientInfo.get(ws)
        if (!info) return

        // Re-check authz (member could be removed mid-session)
        const authz2 = await authorizeProjectRead(info.userId, info.ideaId)
        if (!authz2.ok) {
          ws.send(JSON.stringify({ type: 'error', error: authz2.error }))
          ws.close()
          return
        }

        const { data, error } = await supabaseAdmin
          .from('project_chat_messages')
          .insert({ idea_id: info.ideaId, sender_id: info.userId, body })
          .select(`
            id, idea_id, sender_id, body, created_at,
            sender:profiles!sender_id(id, display_name, avatar_url, username)
          `)
          .single()

        if (error || !data) {
          ws.send(JSON.stringify({ type: 'error', error: error?.message ?? 'Failed to send' }))
          return
        }

        broadcast(info.ideaId, { type: 'message', message: data })

        // ── @cofoundry commands (ephemeral AI responses) ─────────────────────
        if (!body.toLowerCase().startsWith('@cofoundry')) return

        const cmd = body.slice('@cofoundry'.length).trim().toLowerCase()
        const ctx = await getProjectContextForChat(info.ideaId)
        if (!ctx) {
          sendAI(ws, 'I could not load project context for this chat.')
          return
        }

        const recent = (await fetchRecentMessages(info.ideaId, 30)).map(m => ({
          sender: (m as any)?.sender?.display_name ?? (m as any)?.sender?.username ?? (m.sender_id === info.userId ? 'You' : 'Member'),
          body: (m as any).body,
        }))

        if (!cmd || cmd.startsWith('help')) {
          sendAI(ws,
            [
              '**@cofoundry commands**',
              '- `@cofoundry insights` — summarize decisions + next steps',
              '- `@cofoundry draft issue` — draft a GitHub issue from this conversation',
              '- `@cofoundry create issue` — create the last drafted issue (asks permission first)',
              '- `@cofoundry cancel` — discard pending issue draft',
            ].join('\n')
          )
          return
        }

        if (cmd.startsWith('insight')) {
          const text = await generateChatInsights({
            projectTitle: ctx.projectTitle,
            projectSummary: ctx.projectSummary,
            repoFullName: ctx.repoFullName,
            repoUrl: ctx.repoUrl,
            recentMessages: recent,
          })
          sendAI(ws, text)
          return
        }

        if (cmd.startsWith('draft issue')) {
          if (!ctx.repoFullName) {
            sendAI(ws, 'This project is not linked to a GitHub repo yet. Create/link a repo first.')
            return
          }
          const draft = await draftGitHubIssueFromChat({
            projectTitle: ctx.projectTitle,
            projectSummary: ctx.projectSummary,
            repoFullName: ctx.repoFullName,
            recentMessages: recent,
          })
          pendingIssueDraft.set(`${info.ideaId}:${info.userId}`, { repoFullName: ctx.repoFullName, ...draft })
          sendAI(ws,
            [
              '**Draft GitHub issue**',
              `Repo: \`${ctx.repoFullName}\``,
              `Title: **${draft.title}**`,
              '',
              draft.body,
              '',
              'If you want me to create this issue, reply: `@cofoundry create issue`',
              'To discard, reply: `@cofoundry cancel`',
            ].join('\n')
          )
          return
        }

        if (cmd.startsWith('cancel')) {
          pendingIssueDraft.delete(`${info.ideaId}:${info.userId}`)
          sendAI(ws, 'Okay — discarded the pending issue draft.')
          return
        }

        if (cmd.startsWith('create issue')) {
          const draft = pendingIssueDraft.get(`${info.ideaId}:${info.userId}`)
          if (!draft) {
            sendAI(ws, 'No pending issue draft. First run `@cofoundry draft issue`.')
            return
          }

          // Create issue using the project creator's GitHub token (best-effort).
          const { data: ideaRow } = await supabaseAdmin
            .from('project_ideas')
            .select('user_id')
            .eq('id', info.ideaId)
            .single()

          const ownerId = ideaRow?.user_id as string | undefined
          if (!ownerId) {
            sendAI(ws, 'Could not determine the project owner for issue creation.')
            return
          }

          const { data: gh } = await supabaseAdmin
            .from('integrations')
            .select('access_token')
            .eq('user_id', ownerId)
            .eq('provider', 'github')
            .maybeSingle()

          const ownerToken = String((gh as any)?.access_token ?? '').trim()
          if (!ownerToken) {
            sendAI(ws, 'The project owner has not connected GitHub, so I can’t create issues yet.')
            return
          }

          try {
            const created = await createGitHubIssue({
              ownerToken,
              repoFullName: draft.repoFullName,
              title: draft.title,
              body: draft.body,
              labels: draft.labels,
            })
            pendingIssueDraft.delete(`${info.ideaId}:${info.userId}`)
            sendAI(ws, `Created GitHub issue: ${created.url || '(no url returned)'}`)
          } catch (e: any) {
            sendAI(ws, `Failed to create issue: ${String(e?.message ?? e)}`)
          }
          return
        }

        sendAI(ws, 'Unknown command. Try `@cofoundry help`.')
      })

      ws.on('close', () => {
        leaveRooms(ws)
      })
    } catch {
      try { ws.close() } catch { /* noop */ }
    }
  })

  return wss
}

