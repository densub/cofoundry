export type SupabaseEnv = 'TEST' | 'PROD'

/** Active Supabase target: TEST locally, PROD in production/GCP (override with SUPABASE_ENV). */
export function getSupabaseEnv(): SupabaseEnv {
  const raw = process.env.SUPABASE_ENV?.toUpperCase()
  if (raw === 'TEST' || raw === 'PROD') return raw
  return process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST'
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name} (SUPABASE_ENV=${getSupabaseEnv()})`)
  }
  return value
}

export function getSupabaseUrl(): string {
  return requireEnv(`SUPABASE_URL_${getSupabaseEnv()}`)
}

export function getSupabaseAnonKey(): string {
  return requireEnv(`SUPABASE_ANON_KEY_${getSupabaseEnv()}`)
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv(`SUPABASE_SERVICE_ROLE_KEY_${getSupabaseEnv()}`)
}

export function getSupabaseDbPassword(): string {
  return requireEnv(`SUPABASE_DB_${getSupabaseEnv()}_PASSWORD`)
}

/** Project ref from SUPABASE_URL_* (subdomain before .supabase.co). */
export function getSupabaseProjectRef(): string {
  const fromEnv = process.env.SUPABASE_PROJECT_REF
  if (fromEnv) return fromEnv
  const match = getSupabaseUrl().match(/^https:\/\/([^.]+)\.supabase\.co\/?/)
  if (!match) {
    throw new Error(`Could not parse project ref from ${getSupabaseUrl()}`)
  }
  return match[1]
}
