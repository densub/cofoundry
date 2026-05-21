import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Logo } from '../components/brand/Logo'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

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
            <h2 className="text-xl font-semibold text-fg mb-6">
              {mode === 'signin' ? 'Welcome back' : 'Join CoFoundry'}
            </h2>

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

              <button type="submit" disabled={loading} className="w-full py-2.5 btn-primary disabled:opacity-60 text-sm">
                {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
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
