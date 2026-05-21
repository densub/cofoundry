/** App URL Supabase redirects to after GitHub OAuth (must be allowlisted in Supabase Auth). */
export function getAuthCallbackUrl(): string {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined
  if (configured) return configured.replace(/\/$/, '')
  return `${window.location.origin}/auth/callback`
}
