import { getAuthHeader } from './supabase'
import { KNode, KEdge, Profile, NodeType, Message, UserMatch, MatchInsights, MatchedNodePair } from '../types'

const BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeader()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json()
}

// ── Profile ──────────────────────────────────────────────────────────────────
export const profileApi = {
  getMe: () => request<Profile>('/profile/me'),

  updateMe: (data: Partial<Profile>) =>
    request<Profile>('/profile/me', { method: 'PUT', body: JSON.stringify(data) }),

  onboard: (data: {
    display_name: string
    role: string
    bio: string
  }) => request<{ rootNode: KNode; childNodes: KNode[] }>('/profile/onboard', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// ── Nodes ─────────────────────────────────────────────────────────────────────
export const nodesApi = {
  getGraph: () => request<{ nodes: KNode[]; edges: KEdge[] }>('/nodes/graph'),

  getNode: (id: string) => request<KNode>(`/nodes/${id}`),

  create: (data: {
    type: NodeType
    title: string
    parent_id?: string
    generate?: boolean
    content?: string
    summary?: string
    additional_context?: string
  }) => request<KNode>('/nodes', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<KNode>) =>
    request<KNode>(`/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/nodes/${id}`, { method: 'DELETE' }),

  createEdge: (from: string, to: string, type = 'related') =>
    request<KEdge>('/nodes/edges', {
      method: 'POST',
      body: JSON.stringify({ from_node_id: from, to_node_id: to, relationship_type: type }),
    }),
}

// ── Chat (streaming) ──────────────────────────────────────────────────────────
export async function* streamChat(
  nodeId: string,
  messages: Message[],
  userMessage: string,
  conversationId?: string
): AsyncGenerator<{ text?: string; operations?: unknown; done?: boolean }> {
  const authHeaders = await getAuthHeader()

  const res = await fetch(`${BASE}/chat/${nodeId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ messages, message: userMessage, conversation_id: conversationId }),
  })

  if (!res.ok || !res.body) throw new Error('Stream failed')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') { yield { done: true }; return }
      try {
        yield JSON.parse(data)
      } catch { /* partial chunk */ }
    }
  }
}

export const chatApi = {
  acceptOperation: (nodeId: string, operation: unknown) =>
    request<KNode>(`/chat/${nodeId}/operations`, {
      method: 'POST',
      body: JSON.stringify({ operation }),
    }),
}

// ── Integrations ─────────────────────────────────────────────────────────────
export interface Integration {
  provider: 'github' | 'linkedin'
  provider_username: string | null
  metadata: Record<string, unknown>
  synced_at: string | null
}

export interface IntegrationsStatus {
  github: boolean
  linkedin: boolean
}

export const integrationsApi = {
  status: () => request<IntegrationsStatus>('/integrations/status'),

  list: () => request<Integration[]>('/integrations'),

  getOAuthUrl: (provider: 'github' | 'linkedin', returnTo?: string) =>
    request<{ url: string }>(
      `/integrations/${provider}/url${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`
    ),

  disconnect: (provider: 'github' | 'linkedin') =>
    request<void>(`/integrations/${provider}`, { method: 'DELETE' }),

  importGitHub: () =>
    request<{ created: { projects: number }; message: string }>(
      '/integrations/github/import', { method: 'POST' }
    ),

  importLinkedIn: (data: { manualAbout?: string; manualSkills?: string }) =>
    request<{ created: Array<{ type: string; title: string }>; message: string }>(
      '/integrations/linkedin/import', { method: 'POST', body: JSON.stringify(data) }
    ),
}

// ── Matching ──────────────────────────────────────────────────────────────────
export const matchingApi = {
  findMatches: (options?: { threshold?: number; refresh?: boolean }) => {
    const threshold = options?.threshold ?? 0.65
    const refresh = options?.refresh ? '&refresh=true' : ''
    return request<{ matches: UserMatch[]; cached?: boolean }>(
      `/matching?threshold=${threshold}${refresh}`
    )
  },

  getInsights: (
    otherUserId: string,
    matchedNodes: MatchedNodePair[],
    options?: { refresh?: boolean }
  ) =>
    request<MatchInsights>('/matching/insights', {
      method: 'POST',
      body: JSON.stringify({
        otherUserId,
        matchedNodes,
        refresh: options?.refresh ?? false,
      }),
    }),

  getSaved: () => request<{ matches: UserMatch[]; cached?: boolean }>('/matching/saved'),

  updateStatus: (matchId: string, status: 'connected' | 'dismissed' | 'pending') =>
    request(`/matching/${matchId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
