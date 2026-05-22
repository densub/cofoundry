import { ConnectionRequest } from '../types'

export const CONNECTION_REQUESTS_SEEN_EVENT = 'cofoundry:connection-requests-seen'

function seenKey(userId: string): string {
  return `cofoundry:seen-connection-requests:${userId}`
}

export function getSeenConnectionRequestIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(userId))
    const ids = raw ? JSON.parse(raw) as string[] : []
    return new Set(ids)
  } catch {
    return new Set()
  }
}

export function countUnseenConnectionRequests(userId: string, requests: ConnectionRequest[]): number {
  const seen = getSeenConnectionRequestIds(userId)
  return requests.filter(request => !seen.has(request.id)).length
}

export function markConnectionRequestsSeen(userId: string, requests: ConnectionRequest[]): void {
  const seen = getSeenConnectionRequestIds(userId)
  for (const request of requests) seen.add(request.id)
  localStorage.setItem(seenKey(userId), JSON.stringify(Array.from(seen)))
  window.dispatchEvent(new CustomEvent(CONNECTION_REQUESTS_SEEN_EVENT))
}
