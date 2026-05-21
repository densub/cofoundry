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
  avatar_url: string
  public_repos: number
}

export interface GitHubData {
  user: GitHubProfile
  topRepos: GitHubRepo[]
  topLanguages: string[]
  languageCounts: Record<string, number>
  totalRepos: number
}

export async function fetchGitHubData(token: string): Promise<GitHubData> {
  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'CoFoundry-App',
    Accept: 'application/vnd.github+json',
  }

  const [userRes, reposRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers }),
    fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=owner', { headers }),
  ])

  if (!userRes.ok) throw new Error(`GitHub user fetch failed: ${userRes.status}`)

  const user = await userRes.json() as GitHubProfile
  const allRepos: GitHubRepo[] = reposRes.ok ? (await reposRes.json() as GitHubRepo[]) : []

  const ownRepos = allRepos
    .filter(r => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)

  // Aggregate primary languages across all repos
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
    topRepos: ownRepos.slice(0, 6),
    topLanguages,
    languageCounts,
    totalRepos: ownRepos.length,
  }
}
