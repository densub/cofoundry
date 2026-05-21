import { useEffect, useState } from 'react'
import { matchingApi } from '../lib/api'
import { similarityPercent } from '../lib/similarity'
import { UserMatch } from '../types'
import MatchDetailModal from '../components/Matches/MatchDetailModal'

function ScoreRing({ score }: { score: number }) {
  const pct = similarityPercent(score)
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#3B82F6' : '#F59E0B'
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="14" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${pct * 0.879} 87.9`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{pct}%</span>
    </div>
  )
}

function MatchCard({
  match,
  onSelect,
  onAction,
}: {
  match: UserMatch
  onSelect: () => void
  onAction: (id: string, status: 'connected' | 'dismissed') => void
}) {
  const topMatches = match.matchedNodes.slice(0, 3)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      className="rounded-2xl border border-white/10 bg-space-800 p-5 hover:border-brand-500/40 hover:bg-space-800/90 transition-colors cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={match.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{match.displayName ?? 'Anonymous'}</h3>
            <span className="text-xs text-brand-400/80 opacity-0 group-hover:opacity-100 transition-opacity">
              View details →
            </span>
          </div>
          {match.role && <p className="text-sm text-white/50 mt-0.5">{match.role}</p>}

          <div className="mt-3 space-y-1.5">
            {topMatches.map((mn, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                <span className="text-brand-400/80 flex-shrink-0" aria-hidden>◆</span>
                <span className="truncate">
                  <span className="text-white/70">{mn.myNodeTitle}</span>
                  <span className="mx-1">↔</span>
                  <span>{mn.theirNodeTitle}</span>
                </span>
                <span className="ml-auto flex-shrink-0">{similarityPercent(mn.similarity)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onAction(match.userId, 'connected')}
          className="flex-1 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 text-sm font-medium transition-colors"
        >
          Connect
        </button>
        <button
          onClick={() => onAction(match.userId, 'dismissed')}
          className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white text-sm transition-colors"
        >
          Pass
        </button>
      </div>
    </div>
  )
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<UserMatch[]>([])
  const [selectedMatch, setSelectedMatch] = useState<UserMatch | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [searched, setSearched] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    matchingApi.getSaved()
      .then(({ matches: saved }) => {
        if (cancelled || !saved.length) return
        setMatches(saved)
        setSearched(true)
        setFromCache(true)
      })
      .catch(() => { /* no saved matches yet */ })
      .finally(() => { if (!cancelled) setLoadingSaved(false) })
    return () => { cancelled = true }
  }, [])

  async function findMatches(refresh = false) {
    setLoading(true)
    setError('')
    if (refresh) setSelectedMatch(null)
    try {
      const { matches: found, cached } = await matchingApi.findMatches({ refresh })
      setMatches(found)
      setSearched(true)
      setFromCache(Boolean(cached))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to find matches')
    } finally {
      setLoading(false)
    }
  }

  function handleAction(userId: string, status: 'connected' | 'dismissed') {
    setMatches(prev => prev.filter(m => m.userId !== userId))
    if (selectedMatch?.userId === userId) setSelectedMatch(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Find collaborators</h1>
        <p className="text-white/40 text-sm mt-1">
          Match on GitHub projects from your graph. Results and details are cached to save API usage.
        </p>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => findMatches(false)}
          disabled={loading || loadingSaved}
          className="flex-1 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {fromCache ? 'Loading cached…' : 'Scanning graphs…'}
            </>
          ) : (
            '🔍 Find my matches'
          )}
        </button>
        {searched && matches.length > 0 && (
          <button
            onClick={() => findMatches(true)}
            disabled={loading}
            title="Re-run vector search (bypasses cache)"
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white text-sm transition-colors disabled:opacity-60"
          >
            Refresh
          </button>
        )}
      </div>

      {fromCache && searched && matches.length > 0 && !loading && (
        <p className="text-xs text-white/30 mb-6 -mt-1">Showing cached matches — use Refresh after importing new repos.</p>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {searched && matches.length === 0 && !loading && !loadingSaved && (
        <div className="text-center text-white/30 py-12">
          <div className="text-4xl mb-3">🌱</div>
          <p>No strong matches yet.</p>
          <p className="text-sm mt-1">Import GitHub repos (Integrations) so we can match on projects.</p>
        </div>
      )}

      <div className="space-y-4">
        {matches.map(match => (
          <MatchCard
            key={match.userId}
            match={match}
            onSelect={() => setSelectedMatch(match)}
            onAction={handleAction}
          />
        ))}
      </div>

      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onAction={handleAction}
        />
      )}
    </div>
  )
}
