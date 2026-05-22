import Anthropic from '@anthropic-ai/sdk'
import { NodeType, Message } from '../types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const NODE_SYSTEM_PROMPTS: Record<NodeType, string> = {
  root: 'Create a comprehensive personal knowledge index. Include sections: ## About, ## Core Interests, ## Active Projects, ## Skills & Expertise, ## Currently Exploring. Be warm and personal.',
  project: 'Create a project knowledge node. Include: ## Overview, ## Goals, ## Tech Stack, ## Current Status, ## Key Challenges, ## Connections. Be concrete and detailed.',
  interest: 'Create an interest/passion node. Include: ## What It Is, ## Why It Matters to Me, ## Current Depth, ## Related Ideas, ## Connections. Be authentic.',
  skill: 'Create a skill node. Include: ## Proficiency Level, ## Experience & Context, ## Key Applications, ## Growth Areas, ## Connections. Be honest about depth.',
  expertise: 'Create an expertise domain node. Include: ## Core Knowledge, ## Unique Perspective, ## Contributions, ## Open Questions, ## Connections. Show depth.',
  idea: 'Create an idea exploration node. Include: ## The Concept, ## Motivation, ## Potential, ## Open Questions, ## Related Nodes. Be exploratory.',
  custom: 'Create a knowledge node for this topic. Include relevant sections and end with ## Connections listing 2-3 related areas.',
}

export async function generateNodeContent(
  userContext: string,
  nodeType: NodeType,
  title: string,
  additionalContext = ''
): Promise<{ content: string; summary: string }> {
  const [contentRes, summaryRes] = await Promise.all([
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a knowledge graph builder helping users map their mind. ${NODE_SYSTEM_PROMPTS[nodeType]} Keep it 200-400 words. Use clear markdown. Always end with a ## Connections section.`,
      messages: [{
        role: 'user',
        content: `User: ${userContext}\n\nCreate a "${nodeType}" knowledge node titled: "${title}"${additionalContext ? `\n\nExtra context: ${additionalContext}` : ''}`,
      }],
    }),
    anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: 'Summarize in one crisp sentence, max 15 words. No quotes.',
      messages: [{ role: 'user', content: `${nodeType}: ${title}` }],
    }),
  ])

  const content = contentRes.content[0].type === 'text' ? contentRes.content[0].text : ''
  const summary = summaryRes.content[0].type === 'text' ? summaryRes.content[0].text : title

  return { content, summary }
}

export async function generateRootNode(
  displayName: string,
  role: string,
  bio: string
): Promise<{ content: string; summary: string }> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: NODE_SYSTEM_PROMPTS.root,
    messages: [{
      role: 'user',
      content: `Name: ${displayName}\nRole: ${role}\nBio: ${bio}`,
    }],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  return { content, summary: `${displayName}'s knowledge graph` }
}

export async function* streamNodeChat(
  nodeContent: string,
  adjacentContext: string,
  userProfile: string,
  history: Message[],
  userMessage: string
): AsyncGenerator<string> {
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are an intelligent knowledge explorer helping the user develop and refine their ideas.

## Current node content:
${nodeContent}

## Adjacent nodes in their knowledge graph:
${adjacentContext}

## User profile:
${userProfile}

Help the user explore this node through conversation. Be insightful and thought-provoking.
You can suggest expanding this node by creating child nodes, narrowing it into more specific nodes,
or creating new related nodes. When you want to suggest a node operation, append a JSON block like:

\`\`\`operations
{"type": "create_child", "title": "...", "nodeType": "project|interest|skill|expertise|idea", "reason": "..."}
\`\`\`

Keep responses conversational (2-4 paragraphs max). Ask follow-up questions to deepen understanding.`,
    messages: [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ],
  })

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text
    }
  }
}

export function parseNodeOperations(text: string) {
  const match = text.match(/```operations\n([\s\S]*?)```/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

export interface ProjectOverlap {
  yourProject: string
  theirProject: string
  similarity: number
  yourStack: string
  theirStack: string
  projectIdea: string
  commonInterest: string
  collaboration: string
}

export interface MatchInsights {
  summary: string
  projectOverlaps: ProjectOverlap[]
}

function normalizeSimilarityScore(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return normalizeSimilarityScore(fallback, 0)
  if (value > 1) return Math.min(1, value / 100)
  return Math.min(1, Math.max(0, value))
}

interface MatchInsightsInput {
  myProfile: { displayName: string; role: string; bio: string }
  theirProfile: { displayName: string; role: string; bio: string }
  pairs: Array<{
    myTitle: string
    myStack: string
    myDescription: string
    myUrl?: string
    theirTitle: string
    theirStack: string
    theirDescription: string
    theirUrl?: string
    similarity: number
  }>
}

function buildFallbackInsights(input: MatchInsightsInput, summary?: string): MatchInsights {
  return {
    summary:
      summary?.trim() ||
      `${input.myProfile.displayName} and ${input.theirProfile.displayName} have ${input.pairs.length} GitHub project(s) with meaningful overlap.`,
    projectOverlaps: input.pairs.map(p => ({
      yourProject: p.myTitle,
      theirProject: p.theirTitle,
      similarity: normalizeSimilarityScore(p.similarity, 0),
      yourStack: p.myStack,
      theirStack: p.theirStack,
      projectIdea: `Your project: ${p.myDescription.slice(0, 150) || p.myTitle}. Their project: ${p.theirDescription.slice(0, 150) || p.theirTitle}.`,
      commonInterest: `Both work in a similar problem space (${Math.round(p.similarity * 100)}% semantic match).`,
      collaboration: `Consider combining strengths from "${p.myTitle}" and "${p.theirTitle}" into a shared prototype or open-source effort.`,
    })),
  }
}

function normalizeInsights(parsed: Partial<MatchInsights>, input: MatchInsightsInput): MatchInsights {
  const projectOverlaps =
    Array.isArray(parsed.projectOverlaps) && parsed.projectOverlaps.length > 0
      ? parsed.projectOverlaps.map((o, i) => ({
          yourProject: o.yourProject ?? input.pairs[i]?.myTitle ?? '',
          theirProject: o.theirProject ?? input.pairs[i]?.theirTitle ?? '',
          similarity: normalizeSimilarityScore(
            typeof o.similarity === 'number' ? o.similarity : input.pairs[i]?.similarity ?? 0,
            input.pairs[i]?.similarity ?? 0
          ),
          yourStack: o.yourStack ?? input.pairs[i]?.myStack ?? '',
          theirStack: o.theirStack ?? input.pairs[i]?.theirStack ?? '',
          projectIdea: o.projectIdea ?? '',
          commonInterest: o.commonInterest ?? '',
          collaboration: o.collaboration ?? '',
        }))
      : buildFallbackInsights(input).projectOverlaps

  return {
    summary: parsed.summary?.trim() || buildFallbackInsights(input).summary,
    projectOverlaps,
  }
}

export async function generateMatchInsights(input: MatchInsightsInput): Promise<MatchInsights> {
  const pairLines = input.pairs
    .map(
      p =>
        `### "${p.myTitle}" ↔ "${p.theirTitle}" (${Math.round(p.similarity * 100)}% match)
- Your stack: ${p.myStack}
- Their stack: ${p.theirStack}
- Your project: ${p.myDescription || 'n/a'}
- Their project: ${p.theirDescription || 'n/a'}`
    )
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1800,
    system:
      'You analyze project and skill overlaps between two builders. Focus on concrete repositories, complementary skill sets, shared themes, and how they could collaborate on a practical project. Be specific, simple, and useful. Avoid listing generic programming languages as the entire overlap.',
    tools: [
      {
        name: 'record_match_insights',
        description: 'Record GitHub project collaboration analysis',
        input_schema: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: '2-3 simple sentences on why these builders should collaborate based on project themes and complementary skills',
            },
            projectOverlaps: {
              type: 'array',
              description: 'One entry per project pair provided',
              items: {
                type: 'object',
                properties: {
                  yourProject: { type: 'string' },
                  theirProject: { type: 'string' },
                  similarity: { type: 'number' },
                  yourStack: { type: 'string' },
                  theirStack: { type: 'string' },
                  projectIdea: { type: 'string', description: 'What each project is about in plain language' },
                  commonInterest: { type: 'string', description: 'Shared theme or goal between these two projects' },
                  collaboration: { type: 'string', description: 'Concrete ways both could collaborate in this project space' },
                },
                required: [
                  'yourProject', 'theirProject', 'similarity', 'yourStack', 'theirStack',
                  'projectIdea', 'commonInterest', 'collaboration',
                ],
              },
            },
          },
          required: ['summary', 'projectOverlaps'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'record_match_insights' },
    messages: [{
      role: 'user',
      content: `## You
Name: ${input.myProfile.displayName}
Role: ${input.myProfile.role}
Bio: ${input.myProfile.bio}

## Them
Name: ${input.theirProfile.displayName}
Role: ${input.theirProfile.role}
Bio: ${input.theirProfile.bio}

## Matched project and skill overlap pairs
${pairLines}

Analyze each overlap pair. Include one concrete collaboration recommendation.`,
    }],
  })

  const toolBlock = response.content.find(b => b.type === 'tool_use')
  if (toolBlock?.type === 'tool_use' && toolBlock.name === 'record_match_insights') {
    return normalizeInsights(toolBlock.input as Partial<MatchInsights>, input)
  }

  // Legacy text fallback if tool_use missing
  const raw = response.content.find(b => b.type === 'text')
  const text = raw?.type === 'text' ? raw.text : ''
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      const cleaned = text
        .slice(start, end + 1)
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
      return normalizeInsights(JSON.parse(cleaned) as Partial<MatchInsights>, input)
    } catch {
      /* use text summary fallback */
    }
  }

  return buildFallbackInsights(input, text.slice(0, 600))
}
