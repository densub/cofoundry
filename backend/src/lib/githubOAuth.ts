import { getSupabaseEnv } from './supabaseConfig'

export function getGithubClientId(): string | undefined {
  return process.env[`GITHUB_CLIENT_ID_${getSupabaseEnv()}`]
}

export function getGithubClientSecret(): string | undefined {
  return process.env[`GITHUB_CLIENT_SECRET_${getSupabaseEnv()}`]
}
