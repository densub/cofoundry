import { useEffect, useState } from 'react'
import { matchingApi } from '../../lib/api'
import { getCachedInsights, setCachedInsights } from '../../lib/matchInsightsCache'
import { similarityPercent } from '../../lib/similarity'
import { UserMatch, MatchInsights } from '../../types'

function ScoreRing({ score }: { score: number }) {
  const pct = similarityPercent(score)
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#3B82F6' : '#F59E0B'
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="14" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${pct * 0.879} 87.9`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{pct}%</span>
    </div>
  )
}

function ProjectPairHeader({
  yourProject,
  theirProject,
  similarity,
}: {
  yourProject: string
  theirProject: string
  similarity: number
}) {
  return (
    <div className="flex items-start gap-2 text-sm mb-3">
      <span className="text-brand-400 flex-shrink-0" aria-hidden>◆</span>
      <div className="min-w-0 flex-1">
        <p className="text-white/90 font-medium leading-snug">
          <span className="text-white">{yourProject}</span>
          <span className="text-white/35 mx-1.5">↔</span>
          <span className="text-white">{theirProject}</span>
        </p>
        <p className="text-xs text-white/40 mt-0.5">{similarityPercent(similarity)}% project match</p>
      </div>
    </div>
  )
}

interface Props {
  match: UserMatch
  onClose: () => void
  onAction: (userId: string, status: 'connected' | 'dismissed') => void
}

export default function MatchDetailModal({ match, onClose, onAction }: Props) {
  const [insights, setInsights] = useState<MatchInsights | null>(() =>
    getCachedInsights(match.userId, match.matchedNodes)
  )
  const [loading, setLoading] = useState(!getCachedInsights(match.userId, match.matchedNodes))
  const [fromCache, setFromCache] = useState(Boolean(getCachedInsights(match.userId, match.matchedNodes)))
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const cached = getCachedInsights(match.userId, match.matchedNodes)
    if (cached) {
      setInsights(cached)
      setFromCache(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setFromCache(false)
    matchingApi.getInsights(match.userId, match.matchedNodes)
      .then(data => {
        if (cancelled) return
        setCachedInsights(match.userId, match.matchedNodes, data)
        setInsights(data)
        setFromCache(Boolean(data.cached))
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load insights')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [match.userId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-space-800 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-space-800/95 backdrop-blur px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <ScoreRing score={match.score} />
            <div className="min-w-0">
              <h2 className="font-semibold text-white truncate">{match.displayName ?? 'Anonymous'}</h2>
              {match.role && <p className="text-sm text-white/50 truncate">{match.role}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          {loading && (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
              <p className="text-sm text-white/40">
                {fromCache ? 'Loading saved analysis…' : 'Analyzing GitHub project overlap…'}
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {insights && !loading && (
            <>
              <section>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                    Match summary
                  </h3>
                  {fromCache && (
                    <span className="text-[10px] uppercase tracking-wide text-white/30">Cached</span>
                  )}
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{insights.summary}</p>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-3">
                  GitHub project overlap
                </h3>
                <div className="space-y-4">
                  {insights.projectOverlaps.map((o, i) => (
                    <div key={i} className="rounded-xl bg-space-900/80 border border-white/10 p-4">
                      <ProjectPairHeader
                        yourProject={o.yourProject}
                        theirProject={o.theirProject}
                        similarity={o.similarity}
                      />

                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="rounded-lg bg-white/5 px-3 py-2">
                          <p className="text-white/40 mb-0.5">Your stack</p>
                          <p className="text-white/75 leading-snug">{o.yourStack || '—'}</p>
                        </div>
                        <div className="rounded-lg bg-white/5 px-3 py-2">
                          <p className="text-white/40 mb-0.5">Their stack</p>
                          <p className="text-white/75 leading-snug">{o.theirStack || '—'}</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <p className="text-white/40 font-medium mb-0.5">What these projects are</p>
                          <p className="text-white/65 leading-relaxed">{o.projectIdea}</p>
                        </div>
                        <div>
                          <p className="text-emerald-400/90 font-medium mb-0.5">Common interest</p>
                          <p className="text-white/65 leading-relaxed">{o.commonInterest}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5">
                          <p className="text-emerald-300/90 font-medium mb-0.5">How you could collaborate</p>
                          <p className="text-white/65 leading-relaxed">{o.collaboration}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {!loading && !insights && !error && (
            <p className="text-sm text-white/40 text-center py-8">No insights available.</p>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-white/10 bg-space-800 px-5 py-4">
          <button
            onClick={() => { onAction(match.userId, 'connected'); onClose() }}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 text-sm font-medium transition-colors"
          >
            Connect
          </button>
          <button
            onClick={() => { onAction(match.userId, 'dismissed'); onClose() }}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white text-sm transition-colors"
          >
            Pass
          </button>
        </div>
      </div>
    </div>
  )
}
