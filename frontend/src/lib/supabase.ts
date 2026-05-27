import { createClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from './supabaseConfig'

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey())

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getAuthHeader(): Promise<Record<string, string>> {
  const session = await getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.access_token ?? null
}
