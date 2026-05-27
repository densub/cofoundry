import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type IssueDraft = {
  title: string
  body: string
  labels?: string[]
}

export async function generateChatInsights(input: {
  projectTitle: string
  projectSummary: string
  repoFullName?: string | null
  repoUrl?: string | null
  recentMessages: Array<{ sender: string; body: string }>
}): Promise<string> {
  const transcript = input.recentMessages
    .slice(-25)
    .map(m => `- ${m.sender}: ${m.body}`)
    .join('\n')

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system:
      'You are CoFoundry, an assistant embedded in a project group chat. ' +
      'Your job is to extract crisp insights and next steps. ' +
      'Be concise. Use bullet points. Do not invent facts. Do not mention internal policies. ' +
      'If the conversation lacks context, ask 1 clarifying question.',
    messages: [
      {
        role: 'user',
        content:
          `Project: ${input.projectTitle}\n` +
          `Summary: ${input.projectSummary}\n` +
          `Repo: ${input.repoFullName ?? 'n/a'}\n` +
          `Repo URL: ${input.repoUrl ?? 'n/a'}\n\n` +
          `Recent chat (most recent last):\n${transcript}`,
      },
    ],
  })

  const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
  return text.trim() || 'No insights yet — what decision are you trying to make?'
}

export async function draftGitHubIssueFromChat(input: {
  projectTitle: string
  projectSummary: string
  repoFullName: string
  recentMessages: Array<{ sender: string; body: string }>
}): Promise<IssueDraft> {
  const transcript = input.recentMessages
    .slice(-25)
    .map(m => `- ${m.sender}: ${m.body}`)
    .join('\n')

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system:
      'You are CoFoundry, an assistant that drafts GitHub issues from team chat. ' +
      'Return a focused issue that is actionable and specific. ' +
      'Prefer minimal scope. Avoid overpromising. Use markdown in body.',
    tools: [
      {
        name: 'draft_issue',
        description: 'Draft a GitHub issue',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            labels: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'body'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'draft_issue' },
    messages: [
      {
        role: 'user',
        content:
          `Repo: ${input.repoFullName}\n` +
          `Project: ${input.projectTitle}\n` +
          `Summary: ${input.projectSummary}\n\n` +
          `Recent chat (most recent last):\n${transcript}\n\n` +
          `Draft ONE issue that best captures the actionable outcome of this conversation.`,
      },
    ],
  })

  const tool = res.content.find(b => b.type === 'tool_use')
  if (tool?.type === 'tool_use' && tool.name === 'draft_issue') {
    const draft = tool.input as IssueDraft
    return {
      title: String(draft.title ?? '').trim().slice(0, 200) || 'Chat follow-up',
      body: String(draft.body ?? '').trim() || 'Context: see team chat.',
      labels: Array.isArray(draft.labels) ? draft.labels.map(String).slice(0, 6) : [],
    }
  }

  return {
    title: 'Chat follow-up',
    body: 'Context: see team chat.',
    labels: [],
  }
}

