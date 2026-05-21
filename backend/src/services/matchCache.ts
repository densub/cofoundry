import { createHash } from 'crypto'

export const MATCH_LIST_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

interface MatchedNodeLike {
  myNodeId: string
  theirNodeId: string
  similarity: number
}

export function fingerprintUserProjects(
  nodes: Array<{ id: string; updated_at?: string | null }>
): string {
  const payload = nodes
    .map(n => `${n.id}:${n.updated_at ?? ''}`)
    .sort()
    .join('|')
  return createHash('sha256').update(payload).digest('hex').slice(0, 32)
}

export function fingerprintInsights(
  pairs: MatchedNodeLike[],
  nodeVersions: Map<string, string>
): string {
  const payload = pairs
    .map(p => ({
      my: p.myNodeId,
      their: p.theirNodeId,
      sim: Math.round(p.similarity * 10000) / 10000,
      myV: nodeVersions.get(p.myNodeId) ?? '',
      theirV: nodeVersions.get(p.theirNodeId) ?? '',
    }))
    .sort((a, b) => `${a.my}:${a.their}`.localeCompare(`${b.my}:${b.their}`))
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32)
}

export function isWithinTtl(cachedAt: string | null | undefined, ttlMs = MATCH_LIST_TTL_MS): boolean {
  if (!cachedAt) return false
  return Date.now() - new Date(cachedAt).getTime() < ttlMs
}

// Dedupe concurrent insight generation for the same pair set
const insightsInFlight = new Map<string, Promise<unknown>>()

export function dedupeInsights<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = insightsInFlight.get(key)
  if (existing) return existing as Promise<T>

  const promise = factory().finally(() => {
    insightsInFlight.delete(key)
  })
  insightsInFlight.set(key, promise)
  return promise
}
