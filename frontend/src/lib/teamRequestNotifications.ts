import { TeamRequest } from '../types'

export const TEAM_REQUESTS_SEEN_EVENT = 'cofoundry:team-requests-seen'

function seenKey(userId: string): string {
  return `cofoundry:seen-team-requests:${userId}`
}

export function getSeenTeamRequestIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(userId))
    const ids = raw ? JSON.parse(raw) as string[] : []
    return new Set(ids)
  } catch {
    return new Set()
  }
}

export function countUnseenTeamRequests(userId: string, requests: TeamRequest[]): number {
  const seen = getSeenTeamRequestIds(userId)
  return requests.filter(request => !seen.has(request.id)).length
}

export function markTeamRequestsSeen(userId: string, requests: TeamRequest[]): void {
  const seen = getSeenTeamRequestIds(userId)
  for (const request of requests) seen.add(request.id)
  localStorage.setItem(seenKey(userId), JSON.stringify(Array.from(seen)))
  window.dispatchEvent(new CustomEvent(TEAM_REQUESTS_SEEN_EVENT))
}

