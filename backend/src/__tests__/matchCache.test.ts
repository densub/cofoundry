import {
  dedupeInsights,
  fingerprintInsights,
  fingerprintUserProjects,
  isWithinTtl,
  MATCH_LIST_TTL_MS,
} from '../services/matchCache'

// ──────────────────────────────────────────────────────────────────────────────
// fingerprintUserProjects
// ──────────────────────────────────────────────────────────────────────────────

describe('fingerprintUserProjects', () => {
  it('returns a 32-char hex string', () => {
    const fp = fingerprintUserProjects([{ id: 'abc', updated_at: '2024-01-01' }])
    expect(fp).toMatch(/^[a-f0-9]{32}$/)
  })

  it('is stable for the same input', () => {
    const nodes = [{ id: 'n1', updated_at: '2024-01-01' }, { id: 'n2', updated_at: '2024-01-02' }]
    expect(fingerprintUserProjects(nodes)).toBe(fingerprintUserProjects(nodes))
  })

  it('is order-independent (sorts internally)', () => {
    const a = [{ id: 'n1', updated_at: '2024-01-01' }, { id: 'n2', updated_at: '2024-01-02' }]
    const b = [{ id: 'n2', updated_at: '2024-01-02' }, { id: 'n1', updated_at: '2024-01-01' }]
    expect(fingerprintUserProjects(a)).toBe(fingerprintUserProjects(b))
  })

  it('differs when node ids change', () => {
    const a = fingerprintUserProjects([{ id: 'n1', updated_at: null }])
    const b = fingerprintUserProjects([{ id: 'n2', updated_at: null }])
    expect(a).not.toBe(b)
  })

  it('differs when updated_at changes', () => {
    const a = fingerprintUserProjects([{ id: 'n1', updated_at: '2024-01-01' }])
    const b = fingerprintUserProjects([{ id: 'n1', updated_at: '2024-01-02' }])
    expect(a).not.toBe(b)
  })

  it('handles empty node list', () => {
    expect(() => fingerprintUserProjects([])).not.toThrow()
    expect(fingerprintUserProjects([])).toMatch(/^[a-f0-9]{32}$/)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// fingerprintInsights
// ──────────────────────────────────────────────────────────────────────────────

describe('fingerprintInsights', () => {
  const pairs = [
    { myNodeId: 'm1', theirNodeId: 't1', similarity: 0.8 },
    { myNodeId: 'm2', theirNodeId: 't2', similarity: 0.6 },
  ]
  const versions = new Map([['m1', 'v1'], ['t1', 'v1'], ['m2', 'v2'], ['t2', 'v2']])

  it('returns a 32-char hex string', () => {
    expect(fingerprintInsights(pairs, versions)).toMatch(/^[a-f0-9]{32}$/)
  })

  it('is stable', () => {
    expect(fingerprintInsights(pairs, versions)).toBe(fingerprintInsights(pairs, versions))
  })

  it('changes when similarity changes', () => {
    const a = fingerprintInsights(pairs, versions)
    const modified = [{ ...pairs[0], similarity: 0.9 }, pairs[1]]
    expect(fingerprintInsights(modified, versions)).not.toBe(a)
  })

  it('changes when node versions change', () => {
    const a = fingerprintInsights(pairs, versions)
    const newVersions = new Map(versions)
    newVersions.set('m1', 'v999')
    expect(fingerprintInsights(pairs, newVersions)).not.toBe(a)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// isWithinTtl
// ──────────────────────────────────────────────────────────────────────────────

describe('isWithinTtl', () => {
  it('returns false for null', () => {
    expect(isWithinTtl(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isWithinTtl(undefined)).toBe(false)
  })

  it('returns true for a timestamp just now', () => {
    expect(isWithinTtl(new Date().toISOString())).toBe(true)
  })

  it('returns true for a timestamp within the TTL window', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(isWithinTtl(oneHourAgo)).toBe(true)
  })

  it('returns false for a timestamp older than the TTL', () => {
    const expired = new Date(Date.now() - MATCH_LIST_TTL_MS - 1000).toISOString()
    expect(isWithinTtl(expired)).toBe(false)
  })

  it('respects a custom ttlMs override', () => {
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString()
    expect(isWithinTtl(fiveSecondsAgo, 10_000)).toBe(true)
    expect(isWithinTtl(fiveSecondsAgo, 1_000)).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// dedupeInsights
// ──────────────────────────────────────────────────────────────────────────────

describe('dedupeInsights', () => {
  it('deduplicates concurrent calls for the same key', async () => {
    const factory = jest.fn().mockResolvedValue('result')
    // Both calls launched without awaiting — they run concurrently
    const [r1, r2] = await Promise.all([
      dedupeInsights('key-concurrent', factory),
      dedupeInsights('key-concurrent', factory),
    ])
    expect(factory).toHaveBeenCalledTimes(1)
    expect(r1).toBe('result')
    expect(r2).toBe('result')
  })

  it('returns the same value to all concurrent callers', async () => {
    const factory = jest.fn().mockResolvedValue('shared')
    const results = await Promise.all(
      Array.from({ length: 5 }, () => dedupeInsights('key-multi', factory)),
    )
    expect(factory).toHaveBeenCalledTimes(1)
    expect(results.every(r => r === 'shared')).toBe(true)
  })

  it('calls the factory again for a different key', async () => {
    const factory = jest.fn().mockResolvedValue('result')
    await Promise.all([
      dedupeInsights('keyA', factory),
      dedupeInsights('keyB', factory),
    ])
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('propagates factory errors', async () => {
    const factory = jest.fn().mockRejectedValue(new Error('boom'))
    await expect(dedupeInsights('keyErr', factory)).rejects.toThrow('boom')
  })

  it('allows a new call after the previous promise settles', async () => {
    const factory = jest.fn().mockResolvedValue('ok')
    // Sequential calls — each runs after the previous settles
    await dedupeInsights('keyRetry', factory)
    await dedupeInsights('keyRetry', factory)
    expect(factory).toHaveBeenCalledTimes(2)
  })
})
