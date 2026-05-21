import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Integration, integrationsApi } from '../lib/api'
import IntegrationCard from '../components/Integrations/IntegrationCard'

export default function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [oauthReady, setOauthReady] = useState({ github: false, linkedin: false })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    loadIntegrations()
    integrationsApi.status().then(setOauthReady).catch(() => {})
  }, [])

  // Handle OAuth redirect back
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      showToast('success', `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully`)
      loadIntegrations()
      setSearchParams({})
    } else if (error) {
      const messages: Record<string, string> = {
        invalid_state: 'OAuth session expired — please try again',
        github_token_failed: 'GitHub authorisation failed',
        linkedin_token_failed: 'LinkedIn authorisation failed',
        linkedin_denied: 'LinkedIn access was denied',
        github_failed: 'GitHub connection failed',
        linkedin_failed: 'LinkedIn connection failed',
      }
      showToast('error', messages[error] ?? `Connection failed: ${error}`)
      setSearchParams({})
    }
  }, [searchParams])

  async function loadIntegrations() {
    try {
      const data = await integrationsApi.list()
      setIntegrations(data)
    } catch {
      // not fatal
    } finally {
      setLoading(false)
    }
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const github = integrations.find(i => i.provider === 'github')
  const linkedin = integrations.find(i => i.provider === 'linkedin')

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-white/40 text-sm mt-1">
          Connect GitHub to choose repositories as <span className="text-white/60">project nodes</span> in your graph. Matching uses projects only.
        </p>
      </div>

      {oauthReady.github && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 mb-8">
          <p className="text-xs text-emerald-400/90">
            Click Connect to approve GitHub access for <span className="font-medium">your</span> account, then select the repositories to import.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <IntegrationCard
            provider="github"
            integration={github}
            enabled={oauthReady.github}
            onConnected={loadIntegrations}
            onDisconnected={loadIntegrations}
            onImported={() => showToast('success', 'Nodes added to your graph!')}
          />
          <IntegrationCard
            provider="linkedin"
            integration={linkedin}
            enabled={false}
            onConnected={loadIntegrations}
            onDisconnected={loadIntegrations}
            onImported={() => showToast('success', 'LinkedIn nodes added to your graph!')}
          />
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/dashboard" className="text-sm text-white/30 hover:text-white/60 transition-colors">
          ← Back to graph
        </Link>
      </div>
    </div>
  )
}
