import { supabaseAdmin } from '../lib/supabase'

/** `null` = legacy (all GitHub project nodes visible until user saves a selection). */
export type GitHubRepoSelection = Set<string> | null

export interface GitHubNodeLike {
  type: string
  title: string
  metadata?: Record<string, unknown> | null
}

export function githubRepoFullName(node: GitHubNodeLike): string | null {
  const gh = node.metadata?.github as { full_name?: string } | undefined
  if (gh?.full_name) return gh.full_name
  if (node.metadata?.source === 'github') return node.title
  return null
}

export function isGitHubProjectNode(node: GitHubNodeLike): boolean {
  return node.type === 'project' && githubRepoFullName(node) !== null
}

export function isNodeExposed(node: GitHubNodeLike, selection: GitHubRepoSelection): boolean {
  if (!isGitHubProjectNode(node)) return true
  const fullName = githubRepoFullName(node)!
  if (selection === null) return true
  return selection.has(fullName)
}

export function filterExposedNodes<T extends GitHubNodeLike & { id: string }>(
  nodes: T[],
  selection: GitHubRepoSelection
): T[] {
  return nodes.filter(n => isNodeExposed(n, selection))
}

export function filterEdgesForNodes<T extends { from_node_id: string; to_node_id: string }>(
  edges: T[],
  visibleIds: Set<string>
): T[] {
  return edges.filter(e => visibleIds.has(e.from_node_id) && visibleIds.has(e.to_node_id))
}

function selectionFromMetadata(metadata: Record<string, unknown> | null | undefined): GitHubRepoSelection {
  const raw = metadata?.selectedRepoFullNames
  if (raw === undefined || raw === null) return null
  if (!Array.isArray(raw)) return new Set<string>()
  return new Set(raw.filter((v): v is string => typeof v === 'string' && v.length > 0))
}

export async function getGitHubRepoSelection(userId: string): Promise<GitHubRepoSelection> {
  const { data } = await supabaseAdmin
    .from('integrations')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .maybeSingle()

  return selectionFromMetadata((data?.metadata ?? {}) as Record<string, unknown>)
}

export async function getGitHubRepoSelections(
  userIds: string[]
): Promise<Map<string, GitHubRepoSelection>> {
  const map = new Map<string, GitHubRepoSelection>()
  if (!userIds.length) return map

  const { data } = await supabaseAdmin
    .from('integrations')
    .select('user_id, metadata')
    .eq('provider', 'github')
    .in('user_id', userIds)

  for (const id of userIds) {
    map.set(id, null)
  }
  for (const row of data ?? []) {
    map.set(row.user_id, selectionFromMetadata((row.metadata ?? {}) as Record<string, unknown>))
  }
  return map
}
