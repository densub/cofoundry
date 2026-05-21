import { MatchInsights, MatchedNodePair } from '../types'

const memory = new Map<string, MatchInsights>()

function cacheKey(otherUserId: string, nodes: MatchedNodePair[]): string {
  const pairs = nodes
    .map(n => `${n.myNodeId}:${n.theirNodeId}:${Math.round(n.similarity * 10000)}`)
    .sort()
    .join('|')
  return `${otherUserId}::${pairs}`
}

export function getCachedInsights(otherUserId: string, nodes: MatchedNodePair[]): MatchInsights | null {
  return memory.get(cacheKey(otherUserId, nodes)) ?? null
}

export function setCachedInsights(
  otherUserId: string,
  nodes: MatchedNodePair[],
  insights: MatchInsights
): void {
  memory.set(cacheKey(otherUserId, nodes), insights)
}
