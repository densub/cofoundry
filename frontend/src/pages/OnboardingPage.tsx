import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { profileApi, integrationsApi, nodesApi, Integration } from '../lib/api'
import { useStore } from '../store/useStore'
import IntegrationCard from '../components/Integrations/IntegrationCard'
import { Logo } from '../components/brand/Logo'

type Step = 'profile' | 'integrations' | 'generating'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { setProfile, setNodes, setEdges } = useStore()

  const [step, setStep] = useState<Step>('profile')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('')
  const [bio, setBio] = useState('')
  const [rootReady, setRootReady] = useState(false)
  const [githubIntegration, setGithubIntegration] = useState<Integration | undefined>()
  const [githubConnected, setGithubConnected] = useState(false)
  const [oauthReady, setOauthReady] = useState(false)
  const [projectCount, setProjectCount] = useState(0)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    integrationsApi.status().then(s => setOauthReady(s.github)).catch(() => {})
  }, [])

  useEffect(() => {
    if (step !== 'integrations') return

    integrationsApi.list().then(list => {
      const gh = list.find(i => i.provider === 'github')
      setGithubIntegration(gh)
      setGithubConnected(!!gh)
    }).catch(() => {})

    nodesApi.getGraph().then(g => {
      setProjectCount(g.nodes.filter(n => n.type === 'project').length)
    }).catch(() => {})
  }, [step])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('error')
    if (connected === 'github') {
      setGithubConnected(true)
      setRootReady(true)
      setStep('integrations')
      setToast('GitHub connected')
      integrationsApi.list().then(list => {
        const gh = list.find(i => i.provider === 'github')
        setGithubIntegration(gh)
        setGithubConnected(!!gh)
      }).catch(() => {})
      nodesApi.getGraph().then(g => {
        setProjectCount(g.nodes.filter(n => n.type === 'project').length)
      }).catch(() => {})
      setSearchParams({})
    } else if (oauthError) {
      setError('GitHub connection failed — try again')
      setRootReady(true)
      setStep('integrations')
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  async function handleProfileNext() {
    if (!displayName.trim() || !role.trim()) {
      setError('Name and role are required')
      return
    }
    setError('')
    setStep('generating')

    try {
      const result = await profileApi.onboard({
        display_name: displayName.trim(),
        role: role.trim(),
        bio: bio.trim(),
      })
      setNodes([result.rootNode])
      setEdges([])
      const profile = await profileApi.getMe()
      setProfile(profile)
      setRootReady(true)
      setStep('integrations')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set up profile')
      setStep('profile')
    }
  }

  async function refreshProjectCount() {
    const g = await nodesApi.getGraph()
    const projects = g.nodes.filter(n => n.type === 'project')
    setProjectCount(projects.length)
    setNodes([...g.nodes.filter(n => n.type === 'root' || n.type === 'project')])
    setEdges(g.edges)
    return projects.length
  }

  async function handleFinish() {
    if (!githubConnected) {
      setError('Connect GitHub to import your projects')
      return
    }
    if (projectCount === 0) {
      setError('Select and import at least one GitHub repository')
      return
    }

    navigate('/dashboard')
  }

  const canFinish = rootReady && githubConnected && projectCount > 0

  return (
    <div className="min-h-screen bg-space-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8 gap-2">
          <Logo size="lg" />
          <p className="text-fg-muted text-sm">Your graph is built from GitHub projects</p>
        </div>

        {step === 'generating' ? (
          <div className="card p-12 text-center">
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-brand-500 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <h3 className="text-xl font-semibold text-fg mb-2">Setting things up…</h3>
            <p className="text-fg-muted text-sm">Creating your profile and importing projects.</p>
          </div>
        ) : (
          <div className="card p-8">
            <div className="flex gap-2 mb-8">
              {(['profile', 'integrations'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className="h-px w-8 bg-white/10" />}
                  <div className={`flex items-center gap-2 text-sm ${step === s ? 'text-white' : 'text-white/40'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-brand-600' : 'bg-white/10'}`}>
                      {i + 1}
                    </div>
                    {s === 'profile' ? 'Profile' : 'GitHub'}
                  </div>
                </div>
              ))}
            </div>

            {toast && (
              <p className="text-xs text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2 mb-4">{toast}</p>
            )}

            {step === 'profile' && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-white">Tell us about yourself</h2>
                <p className="text-white/40 text-sm -mt-2">
                  Next you will connect GitHub and choose which repositories become project nodes.
                </p>

                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Name *</label>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl bg-space-700 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Role *</label>
                  <input
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="e.g. Full-stack engineer, Designer, Researcher…"
                    className="w-full rounded-xl bg-space-700 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Bio</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                    placeholder="A short intro — what you build, what you are looking for…"
                    className="w-full rounded-xl bg-space-700 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors resize-none"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  onClick={handleProfileNext}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-medium text-sm transition-colors"
                >
                  Next: Connect GitHub →
                </button>
              </div>
            )}

            {step === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Import your projects</h2>
                  <p className="text-white/40 text-sm mt-1">
                    Connect GitHub and choose which repos become project nodes.
                  </p>
                </div>

                <IntegrationCard
                  provider="github"
                  integration={githubIntegration}
                  enabled={oauthReady}
                  oauthReturnTo="/onboarding"
                  onConnected={() => {
                    integrationsApi.list().then(list => {
                      const gh = list.find(i => i.provider === 'github')
                      setGithubIntegration(gh)
                      setGithubConnected(!!gh)
                    })
                  }}
                  onDisconnected={() => {
                    setGithubIntegration(undefined)
                    setGithubConnected(false)
                    setProjectCount(0)
                  }}
                  onImported={() => {
                    refreshProjectCount()
                    setToast('Projects imported')
                  }}
                />

                {projectCount > 0 && (
                  <p className="text-xs text-emerald-400/90">
                    {projectCount} project{projectCount === 1 ? '' : 's'} ready in your graph
                  </p>
                )}

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('profile')}
                    className="px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/30 text-white/60 hover:text-white text-sm transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={!canFinish}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 font-medium text-sm transition-colors"
                  >
                    {projectCount > 0 ? 'Go to dashboard →' : 'Import selected projects first'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
