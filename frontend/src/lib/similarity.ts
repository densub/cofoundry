/** Normalize similarity whether stored as 0–1 or 0–100. */
export function normalizeSimilarity(similarity: number): number {
  if (!Number.isFinite(similarity)) return 0
  if (similarity > 1) return Math.min(1, similarity / 100)
  return Math.min(1, Math.max(0, similarity))
}

/** Display similarity as an integer percent capped at 100. */
export function similarityPercent(similarity: number): number {
  return Math.min(100, Math.max(0, Math.round(normalizeSimilarity(similarity) * 100)))
}
