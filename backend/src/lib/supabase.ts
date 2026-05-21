import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// Service-role client (bypasses RLS — only use in trusted server operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Create a per-request client that inherits the user's JWT so RLS applies
export function createUserClient(jwt: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })
}
