import { describe, expect, it } from 'vitest'
import { normalizeSimilarity, similarityPercent } from '../lib/similarity'

// ──────────────────────────────────────────────────────────────────────────────
// normalizeSimilarity
// ──────────────────────────────────────────────────────────────────────────────

describe('normalizeSimilarity', () => {
  it('passes through a 0–1 value unchanged', () => {
    expect(normalizeSimilarity(0.75)).toBe(0.75)
  })

  it('converts a 0–100 value to 0–1', () => {
    expect(normalizeSimilarity(75)).toBe(0.75)
  })

  it('clamps values above 100 to 1', () => {
    expect(normalizeSimilarity(200)).toBe(1)
  })

  it('clamps negative values to 0', () => {
    expect(normalizeSimilarity(-0.5)).toBe(0)
  })

  it('returns 0 for NaN', () => {
    expect(normalizeSimilarity(NaN)).toBe(0)
  })

  it('returns 0 for Infinity', () => {
    expect(normalizeSimilarity(Infinity)).toBe(0)
  })

  it('returns 0 for -Infinity', () => {
    expect(normalizeSimilarity(-Infinity)).toBe(0)
  })

  it('handles the boundary value 1 exactly', () => {
    expect(normalizeSimilarity(1)).toBe(1)
  })

  it('handles the boundary value 0 exactly', () => {
    expect(normalizeSimilarity(0)).toBe(0)
  })

  it('normalises 100 to exactly 1', () => {
    expect(normalizeSimilarity(100)).toBe(1)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// similarityPercent
// ──────────────────────────────────────────────────────────────────────────────

describe('similarityPercent', () => {
  it('converts 0.75 to 75', () => {
    expect(similarityPercent(0.75)).toBe(75)
  })

  it('converts a 0–100 input (75) to 75', () => {
    expect(similarityPercent(75)).toBe(75)
  })

  it('caps at 100 for large values (>=100)', () => {
    expect(similarityPercent(200)).toBe(100)
    expect(similarityPercent(150)).toBe(100)
    expect(similarityPercent(100)).toBe(100)
  })

  it('treats values in (1, 100) as percentages — e.g. 1.5 means 1.5%', () => {
    // normalizeSimilarity: 1.5 > 1 → 1.5/100 = 0.015 → similarityPercent ≈ 2
    expect(similarityPercent(1.5)).toBe(2)
  })

  it('floors at 0 for negative input', () => {
    expect(similarityPercent(-5)).toBe(0)
  })

  it('returns 0 for NaN', () => {
    expect(similarityPercent(NaN)).toBe(0)
  })

  it('returns an integer', () => {
    expect(Number.isInteger(similarityPercent(0.333))).toBe(true)
  })

  it('rounds rather than truncates', () => {
    expect(similarityPercent(0.555)).toBe(56)
    expect(similarityPercent(0.554)).toBe(55)
  })

  it('returns 100 for similarity 1', () => {
    expect(similarityPercent(1)).toBe(100)
  })

  it('returns 0 for similarity 0', () => {
    expect(similarityPercent(0)).toBe(0)
  })
})
