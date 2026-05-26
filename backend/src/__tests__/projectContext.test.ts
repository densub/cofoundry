import { projectContextFromNode } from '../services/projectContext'

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

const ghNode = {
  title: 'my-repo',
  summary: 'A great project',
  content: null,
  metadata: {
    github: {
      full_name: 'alice/my-repo',
      language: 'TypeScript',
      topics: ['react', 'nodejs'],
      description: 'An example GitHub repo',
      html_url: 'https://github.com/alice/my-repo',
    },
  },
}

const ghNodeMinimal = {
  title: 'bare-repo',
  summary: null,
  content: null,
  metadata: {
    github: {
      full_name: 'alice/bare-repo',
    },
  },
}

const manualNode = {
  title: 'Local Project',
  summary: 'Hand-crafted project',
  content: [
    '## Overview',
    'Description: A cool experiment',
    '## Tech stack',
    'Language: Python',
    'Topics: ml, data',
    '## Links',
    'URL: https://example.com/project',
  ].join('\n'),
  metadata: null,
}

const emptyNode = {
  title: 'Empty',
  summary: null,
  content: null,
  metadata: null,
}

// ──────────────────────────────────────────────────────────────────────────────
// GitHub-backed nodes
// ──────────────────────────────────────────────────────────────────────────────

describe('projectContextFromNode — GitHub node', () => {
  it('source is "github"', () => {
    expect(projectContextFromNode(ghNode).source).toBe('github')
  })

  it('uses the node title', () => {
    expect(projectContextFromNode(ghNode).title).toBe('my-repo')
  })

  it('builds stack from language and topics', () => {
    const { stack } = projectContextFromNode(ghNode)
    expect(stack).toContain('TypeScript')
    expect(stack).toContain('react')
    expect(stack).toContain('nodejs')
  })

  it('uses github description', () => {
    expect(projectContextFromNode(ghNode).description).toBe('An example GitHub repo')
  })

  it('includes the html_url', () => {
    expect(projectContextFromNode(ghNode).url).toBe('https://github.com/alice/my-repo')
  })

  it('handles missing language and topics gracefully', () => {
    const { stack } = projectContextFromNode(ghNodeMinimal)
    expect(stack).toBe('Not specified')
  })

  it('falls back to summary when github description is absent', () => {
    const node = {
      ...ghNodeMinimal,
      summary: 'Fallback summary',
      metadata: { github: { full_name: 'alice/bare-repo' } },
    }
    expect(projectContextFromNode(node).description).toBe('Fallback summary')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Manual / graph-backed nodes
// ──────────────────────────────────────────────────────────────────────────────

describe('projectContextFromNode — manual node', () => {
  it('source is "graph"', () => {
    expect(projectContextFromNode(manualNode).source).toBe('graph')
  })

  it('extracts language from content', () => {
    expect(projectContextFromNode(manualNode).stack).toContain('Python')
  })

  it('extracts topics from content', () => {
    expect(projectContextFromNode(manualNode).stack).toContain('ml, data')
  })

  it('extracts description from content', () => {
    expect(projectContextFromNode(manualNode).description).toContain('A cool experiment')
  })

  it('extracts URL from content', () => {
    expect(projectContextFromNode(manualNode).url).toBe('https://example.com/project')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────────────────────────────────────

describe('projectContextFromNode — edge cases', () => {
  it('does not throw on an empty node', () => {
    expect(() => projectContextFromNode(emptyNode)).not.toThrow()
  })

  it('returns a fallback stack string for empty node', () => {
    expect(projectContextFromNode(emptyNode).stack).toBe('See project notes')
  })

  it('returns empty string for description on empty node', () => {
    expect(projectContextFromNode(emptyNode).description).toBe('')
  })
})
