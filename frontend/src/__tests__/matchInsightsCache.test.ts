import { describe, beforeEach, expect, it } from 'vitest'
import { getCachedInsights, setCachedInsights } from '../lib/matchInsightsCache'
import type { MatchInsights, MatchedNodePair } from '../types'

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

const pairs: MatchedNodePair[] = [
  {
    myNodeId: 'm1',
    myNodeTitle: 'Project A',
    myNodeType: 'project',
    theirNodeId: 't1',
    theirNodeTitle: 'Project B',
    theirNodeType: 'project',
    similarity: 0.8,
  },
]

const insights: MatchInsights = {
  summary: 'Strong technical overlap in TypeScript projects.',
  keyOverlaps: ['TypeScript', 'React'],
  complementaryStrengths: ['Frontend', 'Backend'],
  collaborationIdeas: ['Build a shared SDK'],
}

// The module uses a module-level Map, so we need a stable test order.
// Use unique otherUserIds per test-group to avoid cross-test pollution.

// ──────────────────────────────────────────────────────────────────────────────
// getCachedInsights
// ──────────────────────────────────────────────────────────────────────────────

describe('getCachedInsights', () => {
  it('returns null when nothing has been cached', () => {
    expect(getCachedInsights('unknown-user', pairs)).toBeNull()
  })

  it('returns the stored insights after setCachedInsights', () => {
    const userId = 'user-get-1'
    setCachedInsights(userId, pairs, insights)
    expect(getCachedInsights(userId, pairs)).toEqual(insights)
  })

  it('returns null for a different user even if pairs match', () => {
    setCachedInsights('user-get-2', pairs, insights)
    expect(getCachedInsights('user-get-OTHER', pairs)).toBeNull()
  })

  it('returns null when pairs differ (even same user)', () => {
    const userId = 'user-get-3'
    setCachedInsights(userId, pairs, insights)
    const differentPairs: MatchedNodePair[] = [{ ...pairs[0], similarity: 0.5 }]
    expect(getCachedInsights(userId, differentPairs)).toBeNull()
  })

  it('is order-independent for the pairs array', () => {
    const p1: MatchedNodePair = { ...pairs[0], myNodeId: 'p1', theirNodeId: 'q1', similarity: 0.7 }
    const p2: MatchedNodePair = { ...pairs[0], myNodeId: 'p2', theirNodeId: 'q2', similarity: 0.6 }
    const userId = 'user-order'
    setCachedInsights(userId, [p1, p2], insights)
    // Reverse order should still hit the same cache entry
    expect(getCachedInsights(userId, [p2, p1])).toEqual(insights)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// setCachedInsights
// ──────────────────────────────────────────────────────────────────────────────

describe('setCachedInsights', () => {
  it('stores insights that can be retrieved', () => {
    const userId = 'user-set-1'
    setCachedInsights(userId, pairs, insights)
    expect(getCachedInsights(userId, pairs)).not.toBeNull()
  })

  it('overwrites existing cache for the same key', () => {
    const userId = 'user-set-2'
    const first: MatchInsights = { ...insights, summary: 'First' }
    const second: MatchInsights = { ...insights, summary: 'Second' }
    setCachedInsights(userId, pairs, first)
    setCachedInsights(userId, pairs, second)
    expect(getCachedInsights(userId, pairs)?.summary).toBe('Second')
  })

  it('stores independently keyed entries for different users', () => {
    const ins1: MatchInsights = { ...insights, summary: 'For user A' }
    const ins2: MatchInsights = { ...insights, summary: 'For user B' }
    setCachedInsights('user-set-3a', pairs, ins1)
    setCachedInsights('user-set-3b', pairs, ins2)
    expect(getCachedInsights('user-set-3a', pairs)?.summary).toBe('For user A')
    expect(getCachedInsights('user-set-3b', pairs)?.summary).toBe('For user B')
  })
})
