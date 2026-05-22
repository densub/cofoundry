import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { profileApi } from '../lib/api'
import { useStore } from '../store/useStore'
import { Logo } from '../components/brand/Logo'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const setProfile = useStore(s => s.setProfile)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error_description') ?? params.get('error')
    if (oauthError) {
      setError(oauthError)
      return
    }

    let settled = false

    const finish = async () => {
      if (settled) return
      settled = true
      let path = '/dashboard'
      try {
        const profile = await profileApi.getMe()
        setProfile(profile)
        if (!profile.is_onboarded) path = '/onboarding'
      } catch {
        path = '/onboarding'
      }
      navigate(path, { replace: true })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        void finish()
      }
    })

    async function resolveSession() {
      const code = params.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError(exchangeError.message)
          return
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        setError(sessionError.message)
        return
      }
      if (session) await finish()
      else navigate('/auth', { replace: true })
    }

    resolveSession()

    return () => subscription.unsubscribe()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center px-4">
        <div className="card p-8 max-w-sm text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/auth', { replace: true })}
            className="text-brand-400 hover:text-brand-300 text-sm"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-space-950 flex flex-col items-center justify-center gap-4">
      <Logo size="lg" />
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <p className="text-fg-muted text-sm">Signing you in with GitHub…</p>
    </div>
  )
}
