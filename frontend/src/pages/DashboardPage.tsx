import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useAuth } from '../hooks/useAuth'
import { useNodes } from '../hooks/useNodes'
import BubbleGraph from '../components/BubbleGraph/BubbleGraph'
import ChatPanel from '../components/Chat/ChatPanel'
import { KNode, KEdge } from '../types'

function visibleGraph(nodes: KNode[], edges: KEdge[]) {
  const visibleIds = new Set(
    nodes.filter(n => n.type === 'root' || n.type === 'project').map(n => n.id)
  )
  return {
    nodes: nodes.filter(n => visibleIds.has(n.id)),
    edges: edges.filter(
      e =>
        visibleIds.has(typeof e.from_node_id === 'string' ? e.from_node_id : '') &&
        visibleIds.has(typeof e.to_node_id === 'string' ? e.to_node_id : '')
    ),
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { nodes, edges, isGraphLoading, isChatOpen } = useStore()
  const { refresh } = useNodes(user?.id)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })

  const { nodes: graphNodes, edges: graphEdges } = visibleGraph(nodes, edges)
  const projectCount = nodes.filter(n => n.type === 'project').length

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setDims({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isChatOpen])

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-space-900">
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-space-800/60">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40">
            {projectCount} project{projectCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Refresh graph"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <Link
            to="/integrations"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sync GitHub
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div ref={containerRef} className="flex-1 relative">
          {isGraphLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-space-900/80 z-10">
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            </div>
          )}

          {!isGraphLoading && projectCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30">
              <div className="text-center">
                <div className="text-4xl mb-3">◆</div>
                <p className="text-sm">No GitHub projects yet.</p>
                <Link to="/integrations" className="mt-3 inline-block text-brand-400 hover:text-brand-300 text-sm">
                  Connect GitHub & import repos →
                </Link>
              </div>
            </div>
          )}

          {dims.width > 0 && graphNodes.length > 0 && (
            <BubbleGraph nodes={graphNodes} edges={graphEdges} width={dims.width} height={dims.height} />
          )}
        </div>

        <ChatPanel />
      </div>
    </div>
  )
}
