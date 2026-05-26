import { getAuthHeader } from './supabase'
import {
  KNode,
  KEdge,
  Profile,
  NodeType,
  Message,
  UserMatch,
  MatchInsights,
  MatchedNodePair,
  ConnectionsSummary,
  ConnectionsSearchResult,
  ConnectionsNetworkGraph,
  ConnectionPairGraph,
  GitHubCollaboratorMatch,
} from '../types'

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
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
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
  }) => request<Profile>('/profile/onboard', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  completeOnboarding: () =>
    request<Profile>('/profile/onboard/complete', { method: 'POST' }),

  deleteAccount: () =>
    request<void>('/profile/delete-account', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'DELETE' }),
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

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: 'Stream failed' }))
    throw new Error(err.error ?? 'Stream failed')
  }

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
      let parsed: { text?: string; operations?: unknown; done?: boolean; error?: string } | null = null
      try {
        parsed = JSON.parse(data)
      } catch { /* partial chunk */ }
      if (!parsed) continue
      if (parsed.error) throw new Error(parsed.error)
      yield parsed
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

export interface GitHubRepoSummary {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  html_url: string
  stargazers_count: number
  updated_at: string
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

  listGitHubRepos: (refresh = false) =>
    request<{
      repos: GitHubRepoSummary[]
      selectedRepoFullNames: string[] | null
      totalRepos: number
    }>(`/integrations/github/repos${refresh ? '?refresh=true' : ''}`),

  saveGitHubRepoSelection: (selectedRepoFullNames: string[]) =>
    request<{
      created: { projects: number }
      message: string
      selectedCount: number
    }>('/integrations/github/repos', {
      method: 'PUT',
      body: JSON.stringify({ selectedRepoFullNames }),
    }),

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

  findGitHubMatches: (options?: { limit?: number }) =>
    request<{ matches: GitHubCollaboratorMatch[]; message?: string }>(
      `/matching/github?limit=${options?.limit ?? 10}`
    ),

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

// ── Connections ───────────────────────────────────────────────────────────────
export const connectionsApi = {
  list: () => request<ConnectionsSummary>('/connections'),

  getNetworkGraph: () => request<ConnectionsNetworkGraph>('/connections/network-graph'),

  getPairGraph: (otherUserId: string) =>
    request<ConnectionPairGraph>(`/connections/users/${otherUserId}/graph`),

  removeConnection: (otherUserId: string) =>
    request<void>(`/connections/users/${otherUserId}`, { method: 'DELETE' }),

  search: (query: string) =>
    request<ConnectionsSearchResult>(`/connections/search?q=${encodeURIComponent(query)}`),

  sendRequest: (recipientId: string) =>
    request('/connections/requests', {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    }),

  acceptRequest: (requestId: string) =>
    request(`/connections/requests/${requestId}/accept`, { method: 'POST' }),

  cancelRequest: (requestId: string) =>
    request(`/connections/requests/${requestId}/cancel`, { method: 'POST' }),

  declineRequest: (requestId: string) =>
    request(`/connections/requests/${requestId}/decline`, { method: 'POST' }),

  inviteGitHub: (data: { login: string; email: string; profileUrl: string; name?: string | null }) =>
    request('/connections/invites/github', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
