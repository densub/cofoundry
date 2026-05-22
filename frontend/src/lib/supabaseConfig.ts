export type SupabaseEnv = 'TEST' | 'PROD'

function getSupabaseEnv(): SupabaseEnv {
  const raw = import.meta.env.VITE_SUPABASE_ENV as string | undefined
  const normalized = raw?.toUpperCase()
  if (normalized === 'TEST' || normalized === 'PROD') return normalized
  return import.meta.env.PROD ? 'PROD' : 'TEST'
}

function requireEnv(name: string): string {
  const value = import.meta.env[name] as string | undefined
  if (!value) {
    throw new Error(`Missing ${name} (VITE_SUPABASE_ENV=${getSupabaseEnv()})`)
  }
  return value
}

export function getSupabaseUrl(): string {
  return requireEnv(`VITE_SUPABASE_URL_${getSupabaseEnv()}`)
}

export function getSupabaseAnonKey(): string {
  return requireEnv(`VITE_SUPABASE_ANON_KEY_${getSupabaseEnv()}`)
}
