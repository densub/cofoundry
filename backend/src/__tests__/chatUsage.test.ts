// Mock supabase before importing anything that pulls it in at module level
jest.mock('../lib/supabase', () => ({ supabaseAdmin: {} }))

import {
  chatCacheKey,
  CHAT_DAILY_LIMIT,
  CHAT_INPUT_TOKEN_LIMIT,
  CHAT_OUTPUT_TOKEN_LIMIT,
  ChatQuotaError,
  estimateTokens,
  prepareChatContext,
} from '../services/chatUsage'

// ──────────────────────────────────────────────────────────────────────────────
// estimateTokens
// ──────────────────────────────────────────────────────────────────────────────

describe('estimateTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('estimates ~1 token per 4 chars (ceiling)', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcde')).toBe(2)
    expect(estimateTokens('a'.repeat(400))).toBe(100)
  })

  it('is always a positive integer for non-empty input', () => {
    const result = estimateTokens('hello world')
    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBeGreaterThan(0)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// ChatQuotaError
// ──────────────────────────────────────────────────────────────────────────────

describe('ChatQuotaError', () => {
  const resetAt = new Date(Date.now() + 60_000).toISOString()

  it('is an instance of Error', () => {
    expect(new ChatQuotaError(resetAt)).toBeInstanceOf(Error)
  })

  it('stores the resetAt value', () => {
    const err = new ChatQuotaError(resetAt)
    expect(err.resetAt).toBe(resetAt)
  })

  it('has status 429', () => {
    expect(new ChatQuotaError(resetAt).status).toBe(429)
  })

  it('includes a human-readable message', () => {
    const err = new ChatQuotaError(resetAt)
    expect(err.message).toMatch(/daily ai chat limit/i)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// prepareChatContext
// ──────────────────────────────────────────────────────────────────────────────

describe('prepareChatContext', () => {
  const base = {
    nodeContent: 'x'.repeat(100),
    adjacentContext: 'y'.repeat(50),
    userProfile: 'Alice — Engineer',
    history: [] as Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: 'What is this project about?',
  }

  it('returns all five context fields plus estimatedInputTokens', () => {
    const result = prepareChatContext(base)
    expect(result).toHaveProperty('nodeContent')
    expect(result).toHaveProperty('adjacentContext')
    expect(result).toHaveProperty('userProfile')
    expect(result).toHaveProperty('history')
    expect(result).toHaveProperty('userMessage')
    expect(result).toHaveProperty('estimatedInputTokens')
  })

  it('estimatedInputTokens is a positive number', () => {
    const { estimatedInputTokens } = prepareChatContext(base)
    expect(estimatedInputTokens).toBeGreaterThan(0)
  })

  it('truncates an oversized userMessage', () => {
    const big = { ...base, userMessage: 'a'.repeat(50_000) }
    const { userMessage } = prepareChatContext(big)
    expect(userMessage.length).toBeLessThan(50_000)
  })

  it('truncates oversized nodeContent', () => {
    const big = { ...base, nodeContent: 'n'.repeat(100_000) }
    const { nodeContent } = prepareChatContext(big)
    expect(nodeContent.length).toBeLessThan(100_000)
  })

  it('keeps at most 12 history messages', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message ${i}`,
    }))
    const { history: trimmed } = prepareChatContext({ ...base, history })
    expect(trimmed.length).toBeLessThanOrEqual(12)
  })

  it('handles empty history without throwing', () => {
    expect(() => prepareChatContext({ ...base, history: [] })).not.toThrow()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// chatCacheKey
// ──────────────────────────────────────────────────────────────────────────────

describe('chatCacheKey', () => {
  const base = {
    userId: 'user-1',
    nodeId: 'node-1',
    nodeUpdatedAt: '2024-01-01',
    nodeContent: 'content',
    adjacentContext: 'ctx',
    userProfile: 'Alice',
    history: [] as Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: 'hello',
  }

  it('returns a 64-char hex string (SHA-256)', () => {
    expect(chatCacheKey(base)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('is stable for identical inputs', () => {
    expect(chatCacheKey(base)).toBe(chatCacheKey(base))
  })

  it('differs when userMessage changes', () => {
    expect(chatCacheKey(base)).not.toBe(chatCacheKey({ ...base, userMessage: 'bye' }))
  })

  it('differs when userId changes', () => {
    expect(chatCacheKey(base)).not.toBe(chatCacheKey({ ...base, userId: 'user-2' }))
  })

  it('differs when nodeContent changes', () => {
    expect(chatCacheKey(base)).not.toBe(chatCacheKey({ ...base, nodeContent: 'different' }))
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Environment-sourced constants sanity check
// ──────────────────────────────────────────────────────────────────────────────

describe('chat limits', () => {
  it('CHAT_DAILY_LIMIT is a positive integer', () => {
    expect(Number.isInteger(CHAT_DAILY_LIMIT)).toBe(true)
    expect(CHAT_DAILY_LIMIT).toBeGreaterThan(0)
  })

  it('CHAT_INPUT_TOKEN_LIMIT is a positive integer', () => {
    expect(Number.isInteger(CHAT_INPUT_TOKEN_LIMIT)).toBe(true)
    expect(CHAT_INPUT_TOKEN_LIMIT).toBeGreaterThan(0)
  })

  it('CHAT_OUTPUT_TOKEN_LIMIT is a positive integer', () => {
    expect(Number.isInteger(CHAT_OUTPUT_TOKEN_LIMIT)).toBe(true)
    expect(CHAT_OUTPUT_TOKEN_LIMIT).toBeGreaterThan(0)
  })
})
