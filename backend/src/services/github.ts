export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  fork: boolean
  language: string | null
  topics: string[]
  updated_at: string
}

export interface GitHubProfile {
  id: number
  login: string
  name: string | null
  bio: string | null
  email?: string | null
  avatar_url: string
  html_url?: string
  public_repos: number
}

export interface GitHubData {
  user: GitHubProfile
  /** All non-fork repos owned by the user (paginated from GitHub) */
  repos: GitHubRepo[]
  topRepos: GitHubRepo[]
  topLanguages: string[]
  languageCounts: Record<string, number>
  totalRepos: number
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'CoFoundry-App',
    Accept: 'application/vnd.github+json',
  }
}

function publicGithubHeaders(): Record<string, string> {
  return {
    'User-Agent': 'CoFoundry-App',
    Accept: 'application/vnd.github+json',
  }
}

function githubSearchHeaders(token?: string | null): Record<string, string> {
  return token ? githubHeaders(token) : publicGithubHeaders()
}

export interface PublicGitHubUser {
  id: number
  login: string
  name: string | null
  bio: string | null
  email: string | null
  avatar_url: string
  html_url: string
  public_repos: number
  type: 'User' | 'Organization' | string
}

export interface PublicGitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  fork: boolean
  language: string | null
  topics: string[]
  updated_at: string
  owner: {
    login: string
    avatar_url: string
    html_url: string
    type?: 'User' | 'Organization' | string
  }
}

export async function fetchPublicGitHubUser(login: string): Promise<PublicGitHubUser | null> {
  const safeLogin = login.trim().replace(/^@/, '')
  if (!safeLogin) return null

  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(safeLogin)}`, {
    headers: publicGithubHeaders(),
  })

  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub user lookup failed: ${res.status}`)
  return await res.json() as PublicGitHubUser
}

export async function searchPublicGitHubUsers(query: string, limit = 5): Promise<PublicGitHubUser[]> {
  const safeQuery = query.trim()
  if (!safeQuery) return []

  const exact = await fetchPublicGitHubUser(safeQuery).catch(() => null)
  const searchRes = await fetch(
    `https://api.github.com/search/users?q=${encodeURIComponent(safeQuery)}+in:login&type=Users&per_page=${limit}`,
    { headers: publicGithubHeaders() },
  )

  if (!searchRes.ok) throw new Error(`GitHub user search failed: ${searchRes.status}`)
  const payload = await searchRes.json() as { items?: Array<{ login: string }> }
  const logins = [
    ...(exact ? [exact.login] : []),
    ...((payload.items ?? []).map(item => item.login)),
  ]

  const uniqueLogins = Array.from(new Set(logins)).slice(0, limit)
  const users = await Promise.all(uniqueLogins.map(login => fetchPublicGitHubUser(login).catch(() => null)))
  return users.filter((user): user is PublicGitHubUser => user !== null && user.type === 'User')
}

export async function searchPublicGitHubRepos(
  query: string,
  limit = 10,
  token?: string | null
): Promise<PublicGitHubRepo[]> {
  const safeQuery = query.trim()
  if (!safeQuery) return []

  const res = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(safeQuery)}&sort=stars&order=desc&per_page=${limit}`,
    { headers: githubSearchHeaders(token) },
  )

  if (!res.ok) throw new Error(`GitHub repository search failed: ${res.status}`)
  const payload = await res.json() as { items?: PublicGitHubRepo[] }
  return (payload.items ?? []).filter(repo => !repo.fork && repo.owner?.type !== 'Organization')
}

/** Fetch every page of the user's owned repos (non-forks). */
export async function fetchAllUserRepos(token: string): Promise<GitHubRepo[]> {
  const headers = githubHeaders(token)
  const allRepos: GitHubRepo[] = []
  const maxPages = 10 // up to 1000 repos

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=100&type=owner&page=${page}`,
      { headers },
    )
    if (!res.ok) {
      throw new Error(`GitHub repos fetch failed: ${res.status}`)
    }
    const batch = (await res.json()) as GitHubRepo[]
    if (batch.length === 0) break
    allRepos.push(...batch)
    if (batch.length < 100) break
  }

  return allRepos.filter(r => !r.fork)
}

export async function fetchGitHubData(token: string): Promise<GitHubData> {
  const headers = githubHeaders(token)

  const userRes = await fetch('https://api.github.com/user', { headers })
  if (!userRes.ok) throw new Error(`GitHub user fetch failed: ${userRes.status}`)

  const user = (await userRes.json()) as GitHubProfile
  const ownRepos = await fetchAllUserRepos(token)
  const byStars = [...ownRepos].sort((a, b) => b.stargazers_count - a.stargazers_count)

  const languageCounts: Record<string, number> = {}
  for (const repo of ownRepos) {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] ?? 0) + 1
    }
  }

  const topLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang]) => lang)

  return {
    user,
    repos: ownRepos,
    topRepos: byStars.slice(0, 6),
    topLanguages,
    languageCounts,
    totalRepos: ownRepos.length,
  }
}
