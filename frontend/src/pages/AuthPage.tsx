import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Logo } from '../components/brand/Logo'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export default function AuthPage() {
  const { signIn, signUp, signInWithGitHub } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) setError(decodeURIComponent(urlError))
  }, [searchParams])

  async function handleGitHub() {
    setError('')
    setGithubLoading(true)
    try {
      await signInWithGitHub()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'GitHub sign-in failed')
      setGithubLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signin') {
        await signIn(email, password)
        navigate('/dashboard')
      } else {
        await signUp(email, password)
        setSignupDone(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const busy = loading || githubLoading

  return (
    <div className="min-h-screen bg-space-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-8 hover:opacity-90 transition-opacity">
          <Logo size="lg" />
        </Link>

        {signupDone ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-4">📬</div>
            <h2 className="text-xl font-semibold text-fg mb-2">Check your email</h2>
            <p className="text-fg-muted text-sm">We sent a confirmation link to {email}.</p>
            <button onClick={() => setMode('signin')} className="mt-6 text-brand-400 hover:text-brand-300 text-sm">
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="card p-8">
            <h2 className="text-xl font-semibold text-fg mb-2">
              {mode === 'signin' ? 'Welcome back' : 'Join CoFoundry'}
            </h2>
            <p className="text-fg-muted text-sm mb-6">
              {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
            </p>

            <button
              type="button"
              onClick={handleGitHub}
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-white text-space-950 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-60 transition-colors"
            >
              <GitHubIcon className="w-5 h-5" />
              {githubLoading ? 'Redirecting…' : mode === 'signin' ? 'Sign in with GitHub' : 'Create account with GitHub'}
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-space-600" />
              <span className="text-xs text-fg-subtle uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-space-600" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-fg-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-fg-muted mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-field"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button type="submit" disabled={busy} className="w-full py-2.5 btn-primary disabled:opacity-60 text-sm">
                {loading ? 'Loading…' : mode === 'signin' ? 'Sign in with email' : 'Create account with email'}
              </button>
            </form>

            <p className="text-center text-sm text-fg-muted mt-6">
              {mode === 'signin' ? "Don't have an account? " : 'Already have one? '}
              <button
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
                className="text-brand-400 hover:text-brand-300"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
