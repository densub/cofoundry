// Mock supabase before importing anything that pulls it in at module level
jest.mock('../lib/supabase', () => ({ supabaseAdmin: {} }))

import {
  filterEdgesForNodes,
  filterExposedNodes,
  githubRepoFullName,
  isGitHubProjectNode,
  isNodeExposed,
  GitHubNodeLike,
  GitHubRepoSelection,
} from '../services/githubSelection'

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

const ghProject = (fullName: string): GitHubNodeLike => ({
  type: 'project',
  title: fullName.split('/')[1],
  metadata: { github: { full_name: fullName } },
})

const legacyGhProject = (name: string): GitHubNodeLike => ({
  type: 'project',
  title: name,
  metadata: { source: 'github' },
})

const manualProject: GitHubNodeLike = {
  type: 'project',
  title: 'My Idea',
  metadata: {},
}

const skillNode: GitHubNodeLike = {
  type: 'skill',
  title: 'TypeScript',
  metadata: {},
}

// ──────────────────────────────────────────────────────────────────────────────
// githubRepoFullName
// ──────────────────────────────────────────────────────────────────────────────

describe('githubRepoFullName', () => {
  it('extracts full_name from metadata.github', () => {
    expect(githubRepoFullName(ghProject('alice/repo-a'))).toBe('alice/repo-a')
  })

  it('falls back to title when metadata.source is github', () => {
    expect(githubRepoFullName(legacyGhProject('legacy-repo'))).toBe('legacy-repo')
  })

  it('returns null for a manual project node', () => {
    expect(githubRepoFullName(manualProject)).toBeNull()
  })

  it('returns null for a skill node', () => {
    expect(githubRepoFullName(skillNode)).toBeNull()
  })

  it('returns null when metadata is absent', () => {
    expect(githubRepoFullName({ type: 'project', title: 'X' })).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// isGitHubProjectNode
// ──────────────────────────────────────────────────────────────────────────────

describe('isGitHubProjectNode', () => {
  it('returns true for a GitHub project node', () => {
    expect(isGitHubProjectNode(ghProject('alice/repo-a'))).toBe(true)
  })

  it('returns false for a manual project (no github metadata)', () => {
    expect(isGitHubProjectNode(manualProject)).toBe(false)
  })

  it('returns false for a non-project node', () => {
    expect(isGitHubProjectNode(skillNode)).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// isNodeExposed
// ──────────────────────────────────────────────────────────────────────────────

describe('isNodeExposed', () => {
  const repoA = ghProject('alice/repo-a')
  const repoB = ghProject('alice/repo-b')

  it('exposes every node when selection is null (legacy behaviour)', () => {
    expect(isNodeExposed(repoA, null)).toBe(true)
    expect(isNodeExposed(repoB, null)).toBe(true)
    expect(isNodeExposed(skillNode, null)).toBe(true)
  })

  it('exposes a GitHub project if it is in the selection set', () => {
    const sel: GitHubRepoSelection = new Set(['alice/repo-a'])
    expect(isNodeExposed(repoA, sel)).toBe(true)
  })

  it('hides a GitHub project not in the selection set', () => {
    const sel: GitHubRepoSelection = new Set(['alice/repo-a'])
    expect(isNodeExposed(repoB, sel)).toBe(false)
  })

  it('always exposes non-GitHub nodes regardless of selection', () => {
    const sel: GitHubRepoSelection = new Set([])
    expect(isNodeExposed(skillNode, sel)).toBe(true)
    expect(isNodeExposed(manualProject, sel)).toBe(true)
  })

  it('hides all GitHub projects when selection is an empty set', () => {
    const sel: GitHubRepoSelection = new Set([])
    expect(isNodeExposed(repoA, sel)).toBe(false)
    expect(isNodeExposed(repoB, sel)).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// filterExposedNodes
// ──────────────────────────────────────────────────────────────────────────────

describe('filterExposedNodes', () => {
  const nodes = [
    { id: 'a', ...ghProject('alice/repo-a') },
    { id: 'b', ...ghProject('alice/repo-b') },
    { id: 's', ...skillNode },
    { id: 'm', ...manualProject },
  ]

  it('returns all nodes when selection is null', () => {
    expect(filterExposedNodes(nodes, null)).toHaveLength(4)
  })

  it('keeps only selected GitHub projects plus non-GitHub nodes', () => {
    const sel = new Set(['alice/repo-a'])
    const result = filterExposedNodes(nodes, sel)
    const ids = result.map(n => n.id)
    expect(ids).toContain('a')
    expect(ids).not.toContain('b')
    expect(ids).toContain('s')
    expect(ids).toContain('m')
  })

  it('returns only non-GitHub nodes when selection is empty', () => {
    const result = filterExposedNodes(nodes, new Set())
    expect(result.map(n => n.id)).toEqual(['s', 'm'])
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// filterEdgesForNodes
// ──────────────────────────────────────────────────────────────────────────────

describe('filterEdgesForNodes', () => {
  const edges = [
    { from_node_id: 'a', to_node_id: 'b' },
    { from_node_id: 'a', to_node_id: 'c' },
    { from_node_id: 'b', to_node_id: 'c' },
    { from_node_id: 'x', to_node_id: 'y' },
  ]

  it('keeps edges where both ends are in visible set', () => {
    const visible = new Set(['a', 'b', 'c'])
    const result = filterEdgesForNodes(edges, visible)
    expect(result).toHaveLength(3)
  })

  it('drops edges where either endpoint is absent from visible set', () => {
    const visible = new Set(['a', 'c'])
    const result = filterEdgesForNodes(edges, visible)
    expect(result).toEqual([{ from_node_id: 'a', to_node_id: 'c' }])
  })

  it('returns empty array when visible set is empty', () => {
    expect(filterEdgesForNodes(edges, new Set())).toHaveLength(0)
  })
})
