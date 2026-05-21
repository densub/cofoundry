import { useState } from 'react'
import { Integration, integrationsApi } from '../../lib/api'
import { useStore } from '../../store/useStore'
import { nodesApi } from '../../lib/api'

// ── Icons ─────────────────────────────────────────────────────────────────────
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  provider: 'github' | 'linkedin'
  integration: Integration | undefined
  enabled: boolean
  oauthReturnTo?: string
  onConnected: () => void
  onDisconnected: () => void
  onImported: () => void
}

export default function IntegrationCard({
  provider,
  integration,
  enabled,
  oauthReturnTo,
  onConnected,
  onDisconnected,
  onImported,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualAbout, setManualAbout] = useState('')
  const [manualSkills, setManualSkills] = useState('')
  const { addNode, addEdge } = useStore()

  const isGitHub = provider === 'github'
  const connected = !!integration
  const meta = integration?.metadata ?? {}

  async function handleConnect() {
    setLoading('connect')
    setError(null)
    try {
      const { url } = await integrationsApi.getOAuthUrl(provider, oauthReturnTo)
      window.location.href = url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start OAuth')
      setLoading(null)
    }
  }

  async function handleDisconnect() {
    setLoading('disconnect')
    try {
      await integrationsApi.disconnect(provider)
      onDisconnected()
      setResult(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleImportGitHub() {
    setLoading('import')
    setError(null)
    try {
      const res = await integrationsApi.importGitHub()
      setResult(res.message)
      // Refresh nodes
      const graph = await nodesApi.getGraph()
      useStore.getState().setNodes(graph.nodes)
      useStore.getState().setEdges(graph.edges)
      onImported()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleImportLinkedIn() {
    setLoading('import')
    setError(null)
    try {
      const res = await integrationsApi.importLinkedIn({ manualAbout, manualSkills })
      setResult(res.message)
      const graph = await nodesApi.getGraph()
      useStore.getState().setNodes(graph.nodes)
      useStore.getState().setEdges(graph.edges)
      setShowManual(false)
      onImported()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={`rounded-2xl border bg-space-800 p-6 transition-colors ${connected ? 'border-white/20' : 'border-white/10'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGitHub ? 'bg-white/10' : 'bg-blue-600/20'}`}>
            {isGitHub
              ? <GitHubIcon className="w-6 h-6 text-white" />
              : <LinkedInIcon className="w-6 h-6 text-blue-400" />
            }
          </div>
          <div>
            <h3 className="font-semibold text-white">{isGitHub ? 'GitHub' : 'LinkedIn'}</h3>
            {connected ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Connected as {integration.provider_username}
              </p>
            ) : (
              <p className="text-xs text-white/40">Not connected</p>
            )}
          </div>
        </div>

        {connected && (
          <button
            onClick={handleDisconnect}
            disabled={loading === 'disconnect'}
            className="text-xs text-white/30 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Connected: show data summary */}
      {connected && isGitHub && (
        <div className="mb-4 space-y-1.5">
          <p className="text-sm text-white/60">
            <span className="text-white font-medium">{(meta.totalRepos as number) ?? 0}</span> repos
            {((meta.topLanguages as string[] | undefined) ?? []).length > 0 ? (
              <> · <span className="text-white font-medium">{(meta.topLanguages as string[]).join(', ')}</span></>
            ) : null}
          </p>
          <p className="text-xs text-white/30">
            Imports all your GitHub repositories (non-forks) as project nodes
          </p>
        </div>
      )}

      {connected && !isGitHub && typeof meta.headline === 'string' && (
        <div className="mb-4">
          <p className="text-sm text-white/60 italic">"{meta.headline}"</p>
          <p className="text-xs text-white/30 mt-1">Will create 1 expertise node from your headline</p>
        </div>
      )}

      {/* LinkedIn manual import expansion */}
      {connected && !isGitHub && showManual && (
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">
              LinkedIn "About" section <span className="text-white/20">(paste from your profile)</span>
            </label>
            <textarea
              value={manualAbout}
              onChange={e => setManualAbout(e.target.value)}
              rows={3}
              placeholder="Paste your LinkedIn About section here…"
              className="w-full rounded-xl bg-space-700 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">
              Skills <span className="text-white/20">(one per line, or comma-separated)</span>
            </label>
            <textarea
              value={manualSkills}
              onChange={e => setManualSkills(e.target.value)}
              rows={4}
              placeholder="React, Node.js, System Design&#10;Machine Learning&#10;Product Strategy…"
              className="w-full rounded-xl bg-space-700 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>
        </div>
      )}

      {/* Result / Error */}
      {result && (
        <p className="text-xs text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2 mb-3">
          ✓ {result}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      {/* Actions */}
      {!connected ? (
        <button
          onClick={handleConnect}
          disabled={loading === 'connect' || !enabled}
          className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
            isGitHub
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300'
          } disabled:opacity-50`}
        >
          {!enabled
            ? isGitHub
              ? 'Not available — app OAuth not configured'
              : 'Coming Soon'
            : loading === 'connect'
              ? 'Redirecting…'
              : `Connect your ${isGitHub ? 'GitHub' : 'LinkedIn'}`}
        </button>
      ) : (
        <div className="flex gap-2">
          {!isGitHub && !showManual && (
            <button
              onClick={() => setShowManual(true)}
              className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
            >
              + Add skills
            </button>
          )}
          <button
            onClick={isGitHub ? handleImportGitHub : handleImportLinkedIn}
            disabled={loading === 'import'}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              isGitHub
                ? 'bg-white/15 hover:bg-white/25 text-white'
                : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-200'
            }`}
          >
            {loading === 'import' ? (
              <><div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Importing…</>
            ) : '✨ Import to graph'}
          </button>
        </div>
      )}
    </div>
  )
}
