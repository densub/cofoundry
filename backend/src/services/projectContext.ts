interface NodeRow {
  title: string
  summary: string | null
  content: string | null
  metadata?: Record<string, unknown> | null
}

export interface ProjectContext {
  title: string
  stack: string
  description: string
  url?: string
  source: 'github' | 'graph'
}

export function projectContextFromNode(node: NodeRow): ProjectContext {
  const gh = node.metadata?.github as {
    language?: string | null
    topics?: string[]
    description?: string | null
    html_url?: string
    full_name?: string
  } | undefined

  if (gh) {
    const stackParts = [gh.language, ...(gh.topics ?? [])].filter(Boolean) as string[]
    return {
      title: node.title,
      stack: stackParts.join(' · ') || 'Not specified',
      description: gh.description ?? node.summary ?? '',
      url: gh.html_url,
      source: 'github',
    }
  }

  const content = node.content ?? ''
  const language = content.match(/Language:\s*(.+)/i)?.[1]?.trim()
  const topics = content.match(/Topics:\s*(.+)/i)?.[1]?.trim()
  const desc = content.match(/Description:\s*(.+)/i)?.[1]?.trim()
  const url = content.match(/URL:\s*(https?:\/\/\S+)/i)?.[1]?.trim()

  return {
    title: node.title,
    stack: [language, topics].filter(Boolean).join(' · ') || 'See project notes',
    description: desc ?? node.summary ?? content.slice(0, 300),
    url,
    source: 'graph',
  }
}
