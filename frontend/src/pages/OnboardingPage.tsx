import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { profileApi, integrationsApi, nodesApi } from '../lib/api'
import { useStore } from '../store/useStore'
import { Logo } from '../components/brand/Logo'

type Step = 'profile' | 'github' | 'working'

const STEP_STORAGE_KEY = 'onboarding_step'

function storedStep(): Step | null {
  const value = sessionStorage.getItem(STEP_STORAGE_KEY)
  return value === 'profile' || value === 'github' ? value : null
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile, setProfile, setNodes, setEdges, closeChat } = useStore()

  const [step, setStep] = useState<Step>(() => storedStep() ?? 'profile')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('')
  const [bio, setBio] = useState('')
  const [oauthReady, setOauthReady] = useState(false)
  const [error, setError] = useState('')
  const [workingText, setWorkingText] = useState('Setting things up...')
  const [initializing, setInitializing] = useState(true)

  function goToStep(next: Step) {
    setStep(next)
    if (next === 'profile' || next === 'github') {
      sessionStorage.setItem(STEP_STORAGE_KEY, next)
    } else {
      sessionStorage.removeItem(STEP_STORAGE_KEY)
    }
  }

  async function refreshGraph() {
    const graph = await nodesApi.getGraph()
    setNodes(graph.nodes)
    setEdges(graph.edges)
    return graph.nodes.filter(n => n.type === 'project').length
  }

  async function completeOnboarding() {
    const updatedProfile = await profileApi.completeOnboarding()
    setProfile(updatedProfile)
    sessionStorage.removeItem(STEP_STORAGE_KEY)
    navigate('/dashboard', { replace: true })
  }

  async function importGitHubAndFinish() {
    setError('')
    setWorkingText('Importing your GitHub projects...')
    setStep('working')
    try {
      await integrationsApi.importGitHub()
      await refreshGraph()
      await completeOnboarding()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to import GitHub projects')
      goToStep('github')
    }
  }

  useEffect(() => {
    integrationsApi.status().then(s => setOauthReady(s.github)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const connected = searchParams.get('connected') === 'github'
      const oauthError = searchParams.get('error')

      try {
        const p = profile ?? await profileApi.getMe()
        if (!cancelled) {
          setProfile(p)
          setDisplayName(p.display_name ?? '')
          setRole(p.role ?? '')
          setBio(p.bio ?? '')
          if (!connected && !oauthError && (storedStep() === 'github' || (p.display_name && p.role))) {
            goToStep('github')
          }
        }
      } catch {
        // The auth trigger can take a moment to create the profile on first sign-up.
      } finally {
        if (!cancelled) setInitializing(false)
      }

      if (connected) {
        setSearchParams({})
        await importGitHubAndFinish()
      } else if (oauthError) {
        setSearchParams({})
        setError('GitHub connection failed. You can try again or finish without GitHub.')
        goToStep('github')
      }
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

  async function handleProfileContinue() {
    if (!displayName.trim() || !role.trim()) {
      setError('Name and role are required')
      return
    }

    setError('')
    try {
      const updatedProfile = await profileApi.onboard({
        display_name: displayName.trim(),
        role: role.trim(),
        bio: bio.trim(),
      })
      setProfile(updatedProfile)
      goToStep('github')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    }
  }

  async function handleConnectGitHub() {
    setError('')
    setWorkingText('Opening GitHub...')
    setStep('working')
    sessionStorage.setItem(STEP_STORAGE_KEY, 'github')
    try {
      const { url } = await integrationsApi.getOAuthUrl('github', '/onboarding')
      window.location.href = url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start GitHub connection')
      goToStep('github')
    }
  }

  async function handleFinishWithoutGitHub() {
    setError('')
    setWorkingText('Finishing onboarding...')
    setStep('working')
    try {
      setNodes([])
      setEdges([])
      closeChat()
      await completeOnboarding()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to finish onboarding')
      goToStep('github')
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center">
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
    )
  }

  return (
    <div className="min-h-screen bg-space-950 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-12">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8 gap-2">
          <Logo size="lg" />
          <p className="text-fg-muted text-sm">Build your graph from real project work</p>
        </div>

        <div className="card p-5 sm:p-8">
          <div className="flex flex-wrap gap-2 mb-8">
            {(['profile', 'github'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-4 sm:w-8 bg-white/10" />}
                <div className={`flex items-center gap-2 text-sm ${step === s ? 'text-white' : 'text-white/40'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-brand-600' : 'bg-white/10'}`}>
                    {i + 1}
                  </div>
                  {s === 'profile' ? 'Profile' : 'GitHub'}
                </div>
              </div>
            ))}
          </div>

          {step === 'working' && (
            <div className="py-10 text-center">
              <div className="flex justify-center gap-2 mb-6">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full bg-brand-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <h3 className="text-xl font-semibold text-fg mb-2">{workingText}</h3>
              <p className="text-fg-muted text-sm">This should only take a moment.</p>
            </div>
          )}

          {step === 'profile' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Tell us about yourself</h2>
                <p className="text-white/40 text-sm mt-1">
                  This appears in your profile. We will not build or import anything until the next step.
                </p>
              </div>

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
                  placeholder="e.g. Full-stack engineer, Designer, Researcher..."
                  className="w-full rounded-xl bg-space-700 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  placeholder="A short intro: what you build, what you are looking for..."
                  className="w-full rounded-xl bg-space-700 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleProfileContinue}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-medium text-sm transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'github' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Connect GitHub</h2>
                <p className="text-white/40 text-sm mt-1">
                  Give CoFoundry access to your GitHub projects so we can import them into your graph.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-space-800 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Import GitHub projects</h3>
                    <p className="text-sm text-white/50 mt-1">
                      After you approve access, we will import your repositories automatically and take you to your graph.
                    </p>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConnectGitHub}
                  disabled={!oauthReady}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 font-medium text-sm transition-colors"
                >
                  {oauthReady ? 'Connect GitHub' : 'GitHub OAuth is not configured'}
                </button>
                <button
                  onClick={handleFinishWithoutGitHub}
                  className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/30 text-white/60 hover:text-white text-sm transition-colors"
                >
                  Finish without GitHub
                </button>
                <button
                  onClick={() => goToStep('profile')}
                  className="w-full py-2 text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  Back to profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
