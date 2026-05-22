import { supabaseAdmin } from '../lib/supabase'

export type ConnectionStatus = 'connected' | 'incoming' | 'requested' | null

export function normalizePair(a: string, b: string): { user_id_1: string; user_id_2: string } {
  return a < b ? { user_id_1: a, user_id_2: b } : { user_id_1: b, user_id_2: a }
}

export async function getConnectionState(userId: string, otherUserId: string): Promise<ConnectionStatus> {
  const pair = userId < otherUserId
    ? { user_id_1: userId, user_id_2: otherUserId }
    : { user_id_1: otherUserId, user_id_2: userId }

  const { data: connection } = await supabaseAdmin
    .from('connections')
    .select('id')
    .eq('user_id_1', pair.user_id_1)
    .eq('user_id_2', pair.user_id_2)
    .maybeSingle()
  if (connection) return 'connected'

  const { data: request } = await supabaseAdmin
    .from('connection_requests')
    .select('requester_id, recipient_id')
    .eq('status', 'pending')
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .maybeSingle()

  if (!request) return null
  return request.requester_id === userId ? 'requested' : 'incoming'
}

export async function getConnectionStates(userId: string, otherUserIds: string[]): Promise<Map<string, ConnectionStatus>> {
  const uniqueIds = Array.from(new Set(otherUserIds.filter(id => id && id !== userId)))
  const states = new Map<string, ConnectionStatus>(uniqueIds.map(id => [id, null]))
  if (!uniqueIds.length) return states

  const [{ data: connections }, { data: requests }] = await Promise.all([
    supabaseAdmin
      .from('connections')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`),
    supabaseAdmin
      .from('connection_requests')
      .select('requester_id, recipient_id')
      .eq('status', 'pending')
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
  ])

  for (const row of connections ?? []) {
    const otherId = row.user_id_1 === userId ? row.user_id_2 : row.user_id_1
    if (states.has(otherId)) states.set(otherId, 'connected')
  }

  for (const row of requests ?? []) {
    const otherId = row.requester_id === userId ? row.recipient_id : row.requester_id
    if (!states.has(otherId) || states.get(otherId) === 'connected') continue
    states.set(otherId, row.requester_id === userId ? 'requested' : 'incoming')
  }

  return states
}
