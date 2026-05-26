import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/brand/Logo'

export default function AuthCollaboratorPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        localStorage.setItem('cofoundry_join_as', 'collaborator')
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        setDone(true)
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        navigate('/onboarding/collaborator', { replace: true })
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

        {done ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-4">📬</div>
            <h2 className="text-xl font-semibold text-fg mb-2">Check your email</h2>
            <p className="text-fg-muted text-sm leading-relaxed">
              We sent a confirmation link to <strong>{email}</strong>. After confirming, you'll be taken to complete your collaborator profile.
            </p>
            <button onClick={() => setMode('signin')} className="mt-6 text-brand-400 hover:text-brand-300 text-sm">
              Already confirmed? Sign in
            </button>
          </div>
        ) : (
          <div className="card p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-space-700 border border-space-600 text-xs text-fg-muted mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" aria-hidden="true" />
              Joining as a collaborator
            </div>

            <h2 className="text-xl font-semibold text-fg mb-1">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-fg-muted text-sm mb-6">
              {mode === 'signup'
                ? 'No GitHub required. Connect your expertise to real projects.'
                : 'Sign in to access your collaborator profile.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-fg-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input-field"
                  placeholder="you@example.com"
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

              <button type="submit" disabled={loading} className="w-full py-2.5 btn-primary disabled:opacity-60 text-sm font-medium">
                {loading ? 'Loading…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm text-fg-muted mt-5">
              {mode === 'signup' ? 'Already have an account? ' : "Don't have one? "}
              <button
                onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }}
                className="text-brand-400 hover:text-brand-300"
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>

            <div className="mt-6 pt-5 border-t border-space-600 text-center">
              <Link to="/auth" className="text-xs text-fg-subtle hover:text-fg-muted transition-colors">
                ← Back to developer sign-in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
