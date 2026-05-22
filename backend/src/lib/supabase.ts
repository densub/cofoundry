import { createClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from './supabaseConfig'

const supabaseUrl = getSupabaseUrl()
const supabaseServiceKey = getSupabaseServiceRoleKey()
const supabaseAnonKey = getSupabaseAnonKey()

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export function createUserClient(jwt: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })
}
