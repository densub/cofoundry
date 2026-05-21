export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  fork: boolean
  private: boolean
  language: string | null
  topics: string[]
  updated_at: string
}

export interface GitHubProfile {
  id: number
  login: string
  name: string | null
  bio: string | null
  avatar_url: string
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

export async function fetchGitHubUser(token: string): Promise<GitHubProfile> {
  const res = await fetch('https://api.github.com/user', { headers: githubHeaders(token) })
  if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`)
  return (await res.json()) as GitHubProfile
}

export async function fetchGitHubData(token: string): Promise<GitHubData> {
  const user = await fetchGitHubUser(token)
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
