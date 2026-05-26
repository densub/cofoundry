import crypto from 'crypto'
import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { getGithubClientId, getGithubClientSecret } from '../lib/githubOAuth'
import { getSupabaseServiceRoleKey } from '../lib/supabaseConfig'
import { fetchGitHubData, GitHubRepo } from '../services/github'
import { fetchLinkedInProfile } from '../services/linkedin'
import { createNode } from '../services/graph'
import { generateNodeContent } from '../services/llm'

interface GitHubIntegrationRow {
  access_token: string | null
  metadata: Record<string, unknown> | null
}

async function syncGitHubRepoSelection(
  userId: string,
  integration: GitHubIntegrationRow,
  selectedRepoFullNames: string[],
): Promise<{ created: number; alreadyInGraph: number; total: number }> {
  if (!integration.access_token) {
    throw new Error('GitHub token missing — reconnect GitHub')
  }

  const ghData = await fetchGitHubData(integration.access_token)
  const available = new Set(ghData.repos.map(r => r.full_name))
  const selected = selectedRepoFullNames.filter(name => available.has(name))
  const repos = ghData.repos.filter(r => selected.includes(r.full_name))

  const rootNodeId = await getRootNodeId(userId)

  const { data: existingProjects } = await supabaseAdmin
    .from('nodes')
    .select('title, metadata')
    .eq('user_id', userId)
    .eq('type', 'project')

  const existingKeys = new Set(
    (existingProjects ?? []).map(n => {
      const gh = (n.metadata as { github?: { full_name?: string } })?.github
      return gh?.full_name ?? n.title
    }),
  )

  const projectResults = await Promise.allSettled(
    repos.map(async (repo: GitHubRepo) => {
      if (existingKeys.has(repo.full_name)) return null

      const body = githubProjectBody(repo)
      return createNode(userId, {
        type: 'project',
        title: repo.name,
        content: body.content,
        summary: body.summary,
        parentId: rootNodeId ?? undefined,
        metadata: {
          source: 'github',
          github: {
            full_name: repo.full_name,
            description: repo.description,
            language: repo.language,
            topics: repo.topics ?? [],
            html_url: repo.html_url,
            stargazers_count: repo.stargazers_count,
          },
        },
      })
    }),
  )

  const created = projectResults.filter(r => r.status === 'fulfilled' && r.value).length
  const alreadyInGraph = projectResults.filter(r => r.status === 'fulfilled' && r.value === null).length
  const failed = projectResults.filter(r => r.status === 'rejected').length
  if (failed > 0) {
    console.warn(`GitHub import: ${failed} repo(s) failed to create`)
  }

  const priorMeta = (integration.metadata ?? {}) as Record<string, unknown>
  await supabaseAdmin
    .from('integrations')
    .update({
      metadata: {
        ...priorMeta,
        repos: ghData.repos,
        topRepos: ghData.topRepos,
        topLanguages: ghData.topLanguages,
        languageCounts: ghData.languageCounts,
        totalRepos: ghData.totalRepos,
        selectedRepoFullNames: selected,
        synced_at: new Date().toISOString(),
      },
    })
    .eq('user_id', userId)
    .eq('provider', 'github')

  return { created, alreadyInGraph, total: selected.length }
}

function githubProjectBody(repo: GitHubRepo): { content: string; summary: string } {
  const summary =
    (repo.description?.trim() && repo.description.slice(0, 120)) ||
    `${repo.language ?? 'Software'} project on GitHub`
  const lines = [
    '## Overview',
    repo.description?.trim() || `Repository: ${repo.full_name}`,
    '## Tech stack',
    `Language: ${repo.language ?? 'Not specified'}`,
    repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : null,
    `Stars: ${repo.stargazers_count}`,
    '## Links',
    `URL: ${repo.html_url}`,
  ].filter(Boolean)
  return { content: lines.join('\n\n'), summary }
}

const router = Router()

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001'
const STATE_SECRET = getSupabaseServiceRoleKey()

function isOAuthConfigured(clientId?: string, clientSecret?: string): boolean {
  if (!clientId?.trim() || !clientSecret?.trim()) return false
  if (/your_|optional|replace|example/i.test(clientId) || /your_|optional|replace|example/i.test(clientSecret)) {
    return false
  }
  return true
}

function oauthStatus() {
  return {
    github: isOAuthConfigured(getGithubClientId(), getGithubClientSecret()),
    linkedin: isOAuthConfigured(process.env.LINKEDIN_CLIENT_ID, process.env.LINKEDIN_CLIENT_SECRET),
  }
}

// ── State token (HMAC-signed, 10-min TTL) ─────────────────────────────────
function signState(userId: string, provider: string, returnTo = '/integrations'): string {
  const safeReturn =
    returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/integrations'
  const payload = Buffer.from(
    JSON.stringify({ userId, provider, returnTo: safeReturn, exp: Date.now() + 600_000 })
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyState(state: string): { userId: string; provider: string; returnTo?: string } | null {
  const dot = state.lastIndexOf('.')
  if (dot === -1) return null
  const payload = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('base64url')
  if (sig !== expected) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (Date.now() > data.exp) return null
    return data
  } catch {
    return null
  }
}

async function getUserContext(userId: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('display_name, role, bio')
    .eq('id', userId)
    .single()
  return `${data?.display_name ?? ''} — ${data?.role ?? ''}. ${data?.bio ?? ''}`
}

async function getRootNodeId(userId: string): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from('nodes')
    .select('id')
    .eq('user_id', userId)
    .eq('is_root', true)
    .single()
  return data?.id
}

// ══════════════════════════════════════════════════════════════════════════════
// Common — whether the app owner has registered OAuth apps (one-time server setup)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/status', (_req: Request, res: Response): void => {
  res.json(oauthStatus())
})

// ══════════════════════════════════════════════════════════════════════════════
// GITHUB
// ══════════════════════════════════════════════════════════════════════════════

// Returns the GitHub OAuth URL — frontend navigates to it
router.get('/github/url', authMiddleware, (req: AuthRequest, res: Response): void => {
  if (!oauthStatus().github) {
    res.status(503).json({
      error: 'GitHub is not enabled yet. The app administrator must add GITHUB_CLIENT_ID_TEST/PROD and GITHUB_CLIENT_SECRET_TEST/PROD to the server.',
    })
    return
  }
  const returnTo =
    typeof req.query.returnTo === 'string' && req.query.returnTo.startsWith('/')
      ? req.query.returnTo
      : '/integrations'
  const state = signState(req.userId!, 'github', returnTo)
  const params = new URLSearchParams({
    client_id: getGithubClientId()!,
    scope: 'read:user repo',
    state,
  })
  res.json({ url: `https://github.com/login/oauth/authorize?${params}` })
})

// GitHub redirects here after user authorises
router.get('/github/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query as Record<string, string>

  const payload = verifyState(state)
  if (!payload || payload.provider !== 'github') {
    res.redirect(`${FRONTEND_URL}/integrations?error=invalid_state`)
    return
  }

  const returnPath = payload.returnTo ?? '/integrations'

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: getGithubClientId(),
        client_secret: getGithubClientSecret(),
        code,
      }),
    })
    const { access_token, error } = await tokenRes.json() as { access_token?: string; error?: string }

    if (!access_token || error) {
      res.redirect(`${FRONTEND_URL}${returnPath}?error=github_token_failed`)
      return
    }

    const ghData = await fetchGitHubData(access_token)

    await supabaseAdmin.from('integrations').upsert(
      {
        user_id: payload.userId,
        provider: 'github',
        access_token,
        provider_user_id: String(ghData.user.id),
        provider_username: ghData.user.login,
        metadata: {
          repos: ghData.repos,
          topRepos: ghData.topRepos,
          topLanguages: ghData.topLanguages,
          languageCounts: ghData.languageCounts,
          totalRepos: ghData.totalRepos,
          avatar_url: ghData.user.avatar_url,
          bio: ghData.user.bio,
        },
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

    res.redirect(`${FRONTEND_URL}${returnPath}?connected=github`)
  } catch (err) {
    console.error('GitHub callback error:', err)
    res.redirect(`${FRONTEND_URL}${returnPath}?error=github_failed`)
  }
})

// List GitHub repos (cached; ?refresh=true refetches from GitHub)
router.get('/github/repos', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('access_token, metadata')
    .eq('user_id', req.userId)
    .eq('provider', 'github')
    .single()

  if (!integration) {
    res.status(404).json({ error: 'GitHub not connected' })
    return
  }
  if (!integration.access_token) {
    res.status(400).json({ error: 'GitHub token missing — reconnect GitHub' })
    return
  }

  const refresh = req.query.refresh === 'true'
  const meta = (integration.metadata ?? {}) as Record<string, unknown>
  let repos = (meta.repos as GitHubRepo[] | undefined) ?? []

  try {
    if (refresh || !repos.length) {
      const ghData = await fetchGitHubData(integration.access_token)
      repos = ghData.repos
      await supabaseAdmin
        .from('integrations')
        .update({
          metadata: {
            ...meta,
            repos: ghData.repos,
            topRepos: ghData.topRepos,
            topLanguages: ghData.topLanguages,
            languageCounts: ghData.languageCounts,
            totalRepos: ghData.totalRepos,
            synced_at: new Date().toISOString(),
          },
        })
        .eq('user_id', req.userId)
        .eq('provider', 'github')
    }

    const selected =
      meta.selectedRepoFullNames === undefined || meta.selectedRepoFullNames === null
        ? null
        : Array.isArray(meta.selectedRepoFullNames)
          ? (meta.selectedRepoFullNames as string[])
          : []

    res.json({
      repos: repos.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        language: r.language,
        html_url: r.html_url,
        stargazers_count: r.stargazers_count,
        updated_at: r.updated_at,
      })),
      selectedRepoFullNames: selected,
      totalRepos: repos.length,
    })
  } catch (err) {
    console.error('GitHub repos list error:', err)
    res.status(500).json({ error: 'Failed to load repositories' })
  }
})

// Save which repos are visible in your graph and to connections
router.put('/github/repos', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { selectedRepoFullNames } = req.body as { selectedRepoFullNames?: unknown }
  if (!Array.isArray(selectedRepoFullNames)) {
    res.status(400).json({ error: 'selectedRepoFullNames must be an array' })
    return
  }

  const names = selectedRepoFullNames.filter((v): v is string => typeof v === 'string' && v.length > 0)

  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('access_token, metadata')
    .eq('user_id', req.userId)
    .eq('provider', 'github')
    .single()

  if (!integration) {
    res.status(404).json({ error: 'GitHub not connected' })
    return
  }

  try {
    const { created, alreadyInGraph, total } = await syncGitHubRepoSelection(
      req.userId!,
      integration as GitHubIntegrationRow,
      names,
    )

    res.json({
      created: { projects: created },
      total,
      alreadyInGraph,
      selectedCount: total,
      message:
        total === 0
          ? 'No repositories selected — your GitHub projects are hidden from your graph and connections'
          : created > 0
            ? `Showing ${total} ${total === 1 ? 'repository' : 'repositories'} in your graph (${created} newly imported)`
            : `Showing ${total} ${total === 1 ? 'repository' : 'repositories'} in your graph`,
    })
  } catch (err) {
    console.error('GitHub repo selection error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save selection' })
  }
})

// Legacy import — imports all repos (prefer PUT /github/repos with a selection)
router.post('/github/import', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('access_token, metadata')
    .eq('user_id', req.userId)
    .eq('provider', 'github')
    .single()

  if (!integration) { res.status(404).json({ error: 'GitHub not connected' }); return }

  try {
    const ghData = await fetchGitHubData(integration.access_token!)
    const names = ghData.repos.map(r => r.full_name)
    const { created, alreadyInGraph, total } = await syncGitHubRepoSelection(
      req.userId!,
      integration as GitHubIntegrationRow,
      names,
    )

    res.json({
      created: { projects: created },
      total,
      alreadyInGraph,
      message:
        created > 0
          ? `Imported ${created} GitHub ${created === 1 ? 'project' : 'projects'} (${total} repos selected)`
          : `All ${total} selected GitHub ${total === 1 ? 'project is' : 'projects are'} already in your graph`,
    })
  } catch (err) {
    console.error('GitHub import error:', err)
    res.status(500).json({ error: 'Import failed' })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// LINKEDIN
// ══════════════════════════════════════════════════════════════════════════════

router.get('/linkedin/url', authMiddleware, (req: AuthRequest, res: Response): void => {
  if (!oauthStatus().linkedin) {
    res.status(503).json({
      error: 'LinkedIn is not enabled yet. The app administrator must add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to the server.',
    })
    return
  }
  const state = signState(req.userId!, 'linkedin')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${APP_URL}/api/integrations/linkedin/callback`,
    scope: 'openid profile email',
    state,
  })
  res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params}` })
})

router.get('/linkedin/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>

  if (error) {
    res.redirect(`${FRONTEND_URL}/integrations?error=linkedin_denied`)
    return
  }

  const payload = verifyState(state)
  if (!payload || payload.provider !== 'linkedin') {
    res.redirect(`${FRONTEND_URL}/integrations?error=invalid_state`)
    return
  }

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${APP_URL}/api/integrations/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID ?? '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
      }),
    })
    const tokenData = await tokenRes.json() as { access_token?: string }

    if (!tokenData.access_token) {
      res.redirect(`${FRONTEND_URL}/integrations?error=linkedin_token_failed`)
      return
    }

    const profile = await fetchLinkedInProfile(tokenData.access_token)

    await supabaseAdmin.from('integrations').upsert(
      {
        user_id: payload.userId,
        provider: 'linkedin',
        access_token: tokenData.access_token,
        provider_user_id: profile.id,
        provider_username: profile.name,
        metadata: { name: profile.name, headline: profile.headline, email: profile.email },
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

    res.redirect(`${FRONTEND_URL}/integrations?connected=linkedin`)
  } catch (err) {
    console.error('LinkedIn callback error:', err)
    res.redirect(`${FRONTEND_URL}/integrations?error=linkedin_failed`)
  }
})

// Import LinkedIn data → create nodes
// Handles both OAuth profile headline AND manual paste (about + skills text)
router.post('/linkedin/import', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { manualAbout, manualSkills } = req.body

  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('*')
    .eq('user_id', req.userId)
    .eq('provider', 'linkedin')
    .maybeSingle()

  if (!integration && !manualAbout && !manualSkills) {
    res.status(400).json({ error: 'LinkedIn not connected and no manual data provided' })
    return
  }

  try {
    const userCtx = await getUserContext(req.userId!)
    const rootNodeId = await getRootNodeId(req.userId!)
    const created: { type: string; title: string }[] = []

    // From OAuth headline
    if (integration?.metadata?.headline) {
      const headline = integration.metadata.headline as string
      const { data: existing } = await supabaseAdmin
        .from('nodes').select('id').eq('user_id', req.userId)
        .eq('title', headline).eq('type', 'expertise').maybeSingle()

      if (!existing) {
        const md = await generateNodeContent(
          userCtx, 'expertise', headline, `LinkedIn professional headline`
        )
        await createNode(req.userId!, {
          type: 'expertise', title: headline, content: md.content, summary: md.summary, parentId: rootNodeId,
        })
        created.push({ type: 'expertise', title: headline })
      }
    }

    // From manual "About" section paste
    if (manualAbout?.trim()) {
      const md = await generateNodeContent(
        userCtx, 'root',
        'LinkedIn Professional Summary',
        `LinkedIn About section:\n${manualAbout}`
      )
      // Update root node content instead of creating a new one
      if (rootNodeId) {
        await supabaseAdmin.from('nodes')
          .update({ content: md.content, summary: md.summary })
          .eq('id', rootNodeId)
        created.push({ type: 'root', title: 'Updated knowledge graph root' })
      }
    }

    // From manual skills list paste — Claude parses and creates individual skill nodes
    if (manualSkills?.trim()) {
      const skillLines = (manualSkills as string)
        .split(/[\n,•·]/g)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 1 && s.length < 80)
        .slice(0, 10)

      await Promise.allSettled(
        skillLines.map(async (skill: string) => {
          const { data: existing } = await supabaseAdmin
            .from('nodes').select('id').eq('user_id', req.userId)
            .eq('title', skill).eq('type', 'skill').maybeSingle()
          if (existing) return

          const md = await generateNodeContent(userCtx, 'skill', skill, `From LinkedIn skills section`)
          await createNode(req.userId!, {
            type: 'skill', title: skill, content: md.content, summary: md.summary, parentId: rootNodeId,
          })
          created.push({ type: 'skill', title: skill })
        })
      )
    }

    res.json({ created, message: `Created ${created.length} nodes from LinkedIn data` })
  } catch (err) {
    console.error('LinkedIn import error:', err)
    res.status(500).json({ error: 'Import failed' })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// Common
// ══════════════════════════════════════════════════════════════════════════════

// List connected integrations (no tokens returned)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data } = await supabaseAdmin
    .from('integrations')
    .select('provider, provider_username, metadata, synced_at')
    .eq('user_id', req.userId)
  res.json(data ?? [])
})

// Disconnect an integration
router.delete('/:provider', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const provider = req.params.provider as string
  await supabaseAdmin.from('integrations').delete().eq('user_id', req.userId).eq('provider', provider)
  res.status(204).send()
})

export default router
