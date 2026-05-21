export interface LinkedInProfile {
  id: string
  name: string
  headline: string
  email?: string
}

// Sign In with LinkedIn (OpenID Connect) — scopes: openid profile email
export async function fetchLinkedInProfile(token: string): Promise<LinkedInProfile> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`LinkedIn profile fetch failed: ${res.status}`)

  const data = await res.json() as {
    sub?: string
    name?: string
    given_name?: string
    family_name?: string
    email?: string
  }

  const name =
    data.name?.trim() ||
    [data.given_name, data.family_name].filter(Boolean).join(' ').trim() ||
    'LinkedIn User'

  return {
    id: data.sub ?? '',
    name,
    headline: '', // OIDC lite profile has no headline; use manual import on Integrations page
    email: data.email,
  }
}
