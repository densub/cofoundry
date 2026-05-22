import { useEffect, useMemo, useRef, useState } from 'react'
import { connectionsApi, matchingApi } from '../../lib/api'
import { similarityPercent } from '../../lib/similarity'
import BubbleGraph from '../BubbleGraph/BubbleGraph'
import { ConnectionPairGraph, ConnectionProfile, MatchInsights } from '../../types'

interface Props {
  user: ConnectionProfile
  onClose: () => void
}

export default function ConnectionPairGraphModal({ user, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [graph, setGraph] = useState<ConnectionPairGraph | null>(null)
  const [insights, setInsights] = useState<MatchInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const otherLabel = user.display_name ?? user.username ?? 'Connection'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setGraph(null)
    connectionsApi
      .getPairGraph(user.id)
      .then(data => {
        if (!cancelled) setGraph(data)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load graph')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user.id])

  useEffect(() => {
    if (!graph?.matchedNodes.length) {
      setInsights(null)
      return
    }
    let cancelled = false
    setInsightsLoading(true)
    matchingApi.getInsights(user.id, graph.matchedNodes)
      .then(data => {
        if (!cancelled) setInsights(data)
      })
      .catch(() => {
        if (!cancelled) setInsights(null)
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false)
      })
    return () => { cancelled = true }
  }, [graph, user.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setDims({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    measure()
    const t = setTimeout(measure, 50)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [graph, loading])

  const mergedGraph = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] }
    return {
      nodes: [...graph.my.nodes, ...graph.their.nodes],
      edges: [...graph.my.edges, ...graph.their.edges, ...(graph.matchEdges ?? [])],
    }
  }, [graph])

  const projectPairs = graph?.matchedNodes ?? []
  const myCount = graph?.my.nodes.filter(n => n.type === 'project').length ?? 0
  const theirCount = graph?.their.nodes.filter(n => n.type === 'project').length ?? 0
  const overlapCount = projectPairs.length
  const topInsight = insights?.projectOverlaps?.[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
      <div
        className="relative w-full sm:max-w-5xl max-h-[94vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-space-900 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-brand-600/20 overflow-hidden flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-brand-300 font-semibold">
                  {otherLabel.slice(0, 1)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">{otherLabel}</h2>
              <p className="text-sm text-white/40">
                Merged collaboration map
                {graph && graph.score > 0 && (
                  <> · top match {similarityPercent(graph.score)}%</>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="grid lg:grid-cols-[1.35fr_0.9fr] gap-0 min-h-0">
            <div
              ref={containerRef}
              className="relative h-[360px] sm:h-[480px] lg:h-[560px] bg-space-950"
            >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-space-950/90">
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-400 z-10">
              {error}
            </div>
          )}
          {!loading && !error && graph && mergedGraph.nodes.length === 0 && (
            <div className="absolute inset-4 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl">
              <div className="text-3xl text-white/15 mb-2">◇</div>
              <p className="text-sm text-white/40">Neither graph has imported projects or skills yet.</p>
            </div>
          )}
          {!loading && !error && graph && mergedGraph.nodes.length > 0 && dims.width > 0 && (
            <BubbleGraph
              nodes={mergedGraph.nodes}
              edges={mergedGraph.edges}
              width={dims.width}
              height={dims.height}
              readOnly
            />
          )}
              <div className="absolute left-3 top-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-brand-500/15 text-brand-200 border border-brand-400/20 px-3 py-1">You</span>
                <span className="rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 px-3 py-1">{otherLabel}</span>
                <span className="rounded-full bg-purple-500/15 text-purple-200 border border-purple-400/20 px-3 py-1">Overlap links</span>
              </div>
            </div>

            <aside className="border-t lg:border-t-0 lg:border-l border-white/10 bg-space-800/40 p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <p className="text-lg font-bold text-white">{myCount}</p>
                  <p className="text-[11px] text-white/40">Your projects</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <p className="text-lg font-bold text-white">{theirCount}</p>
                  <p className="text-[11px] text-white/40">Their projects</p>
                </div>
                <div className="rounded-2xl bg-purple-500/10 border border-purple-400/20 p-3">
                  <p className="text-lg font-bold text-purple-200">{overlapCount}</p>
                  <p className="text-[11px] text-purple-200/60">Overlaps</p>
                </div>
              </div>

              <section className="rounded-2xl border border-white/10 bg-space-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-white/35 mb-2">AI summary</p>
                {insightsLoading && <p className="text-sm text-white/40">Generating a simple collaboration summary...</p>}
                {!insightsLoading && insights?.summary && (
                  <p className="text-sm text-white/70 leading-relaxed">{insights.summary}</p>
                )}
                {!insightsLoading && !insights?.summary && (
                  <p className="text-sm text-white/40">
                    {overlapCount > 0
                      ? 'Overlap found. Import more project details to generate a richer summary.'
                      : 'No strong project or skill overlap yet.'}
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-2">Collaboration recommendation</p>
                <p className="text-sm text-white/70 leading-relaxed">
                  {topInsight?.collaboration ??
                    (overlapCount > 0
                      ? 'Start with the strongest overlap below and schedule a short build session around a shared prototype.'
                      : 'Once both graphs have more projects or skills, this will suggest a concrete collaboration path.')}
                </p>
              </section>

              {projectPairs.length > 0 && (
                <section>
                  <p className="text-xs uppercase tracking-wide text-white/35 mb-2">Overlap by percentage</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {projectPairs.map(pair => (
                      <div key={`${pair.myNodeId}-${pair.theirNodeId}`} className="rounded-xl border border-white/10 bg-space-900/70 p-3">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="text-[11px] uppercase tracking-wide text-white/35">{pair.myNodeType} overlap</span>
                          <span className="text-sm font-bold text-purple-200">{similarityPercent(pair.similarity)}%</span>
                        </div>
                        <p className="text-sm text-white/75 break-words">
                          <span className="text-brand-300">{pair.myNodeTitle}</span>
                          <span className="text-white/30 mx-1.5">↔</span>
                          <span className="text-emerald-300">{pair.theirNodeTitle}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
