import Anthropic from '@anthropic-ai/sdk'
import { RecommendedRole } from '../types'

const IDEA_ROLE_ENUM = [
  'marketing', 'sales', 'business', 'design', 'product',
  'domain-expert', 'operations', 'finance', 'legal', 'community',
  'developer', 'cto',
] as const

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface TeamAnalysisResult {
  project_summary: string
  target_market: string
  project_stage: 'idea' | 'prototype' | 'launched' | 'growing'
  recommended_roles: RecommendedRole[]
}

export async function analyzeRepoForTeam(node: {
  title: string
  content: string
  summary: string | null
  metadata: Record<string, unknown>
}): Promise<TeamAnalysisResult> {
  const topics = (node.metadata?.topics as string[] | undefined) ?? []
  const language = node.metadata?.language as string | undefined
  const techStack = [language, ...topics.slice(0, 5)].filter(Boolean).join(', ') || 'Not specified'
  const description = node.summary || node.content.slice(0, 600)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: 'You are a startup advisor analyzing a GitHub project to identify team gaps. Be specific to the project — not generic startup advice.',
    tools: [
      {
        name: 'analyze_team_gaps',
        description: 'Analyze a GitHub project and identify what non-technical team roles are needed for it to succeed',
        input_schema: {
          type: 'object' as const,
          properties: {
            project_summary: {
              type: 'string',
              description: '2-3 sentences in plain English for a non-technical audience describing what the project does and who it helps',
            },
            target_market: {
              type: 'string',
              description: 'Who this is built for — be specific',
            },
            project_stage: {
              type: 'string',
              enum: ['idea', 'prototype', 'launched', 'growing'],
              description: 'Current stage based on what you can infer from the description',
            },
            recommended_roles: {
              type: 'array',
              description: '3-5 non-technical roles ordered by priority (1 = most critical). Focus on what this specific project needs to grow.',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: ['marketing', 'sales', 'business', 'design', 'product', 'domain-expert', 'operations', 'finance', 'legal', 'community'],
                  },
                  title: { type: 'string', description: 'Specific title e.g. "Growth & Marketing Co-founder"' },
                  why: { type: 'string', description: '1-2 sentences specific to THIS project explaining why this role matters right now' },
                  priority: { type: 'number' },
                },
                required: ['role', 'title', 'why', 'priority'],
              },
            },
          },
          required: ['project_summary', 'target_market', 'project_stage', 'recommended_roles'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'analyze_team_gaps' },
    messages: [
      {
        role: 'user',
        content: `Project: ${node.title}\nTech stack: ${techStack}\nDescription: ${description}`,
      },
    ],
  })

  const toolBlock = response.content.find(b => b.type === 'tool_use')
  if (toolBlock?.type === 'tool_use' && toolBlock.name === 'analyze_team_gaps') {
    const input = toolBlock.input as TeamAnalysisResult
    return {
      ...input,
      recommended_roles: input.recommended_roles
        .slice(0, 5)
        .sort((a, b) => a.priority - b.priority),
    }
  }

  return {
    project_summary: `${node.title} is a software project that needs a well-rounded team to reach its potential.`,
    target_market: 'Developers and technical users',
    project_stage: 'prototype',
    recommended_roles: [
      { role: 'marketing', title: 'Growth & Marketing', why: 'To help reach potential users and grow awareness of the project.', priority: 1 },
      { role: 'business', title: 'Business Development', why: 'To identify partnerships and paths to sustainability.', priority: 2 },
      { role: 'design', title: 'Product Designer', why: 'To improve the user experience and visual presentation.', priority: 3 },
    ],
  }
}

export interface IdeaAnalysisResult {
  project_summary: string
  target_market: string
  project_stage: 'idea' | 'prototype' | 'launched' | 'growing'
  recommended_roles: Array<RecommendedRole & { is_technical?: boolean }>
}

export async function analyzeIdeaForTeam(idea: {
  title: string
  problem_statement: string
  solution_description?: string | null
  target_market?: string | null
  stage: string
  skills_i_bring?: string | null
  node?: {
    title: string
    summary?: string | null
    metadata: Record<string, unknown>
  }
}): Promise<IdeaAnalysisResult> {
  const nodeSection = idea.node
    ? (() => {
        const topics = (idea.node.metadata?.topics as string[] | undefined) ?? []
        const language = idea.node.metadata?.language as string | undefined
        const techStack = [language, ...topics.slice(0, 5)].filter(Boolean).join(', ')
        return [
          `\nGitHub repo: ${idea.node.title}`,
          idea.node.summary ? `Repo description: ${idea.node.summary}` : null,
          techStack ? `Tech stack: ${techStack}` : null,
        ].filter(Boolean).join('\n')
      })()
    : ''

  const context = [
    `Title: ${idea.title}`,
    `Problem: ${idea.problem_statement}`,
    idea.solution_description ? `Solution: ${idea.solution_description}` : null,
    idea.target_market ? `Target market: ${idea.target_market}` : null,
    `Stage: ${idea.stage}`,
    idea.skills_i_bring ? `What the founder brings: ${idea.skills_i_bring}` : null,
    nodeSection || null,
  ].filter(Boolean).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `You are a startup advisor helping a non-technical founder identify who they need on their team.
Recommend 4-6 roles covering BOTH technical (developer/CTO) and non-technical needs.
Be specific to this idea — not generic startup advice.
Mark technical roles (developer, cto) with is_technical: true.`,
    tools: [
      {
        name: 'analyze_idea_team_gaps',
        description: 'Analyze a business idea and identify what team roles are needed to build and grow it',
        input_schema: {
          type: 'object' as const,
          properties: {
            project_summary: {
              type: 'string',
              description: '2-3 sentences in plain English describing what the idea is and who it helps',
            },
            target_market: {
              type: 'string',
              description: 'Who this is built for — be specific about the user and their pain',
            },
            project_stage: {
              type: 'string',
              enum: ['idea', 'prototype', 'launched', 'growing'],
              description: 'Current stage based on what the founder described',
            },
            recommended_roles: {
              type: 'array',
              description: '4-6 roles ordered by priority. Include at least one technical role (developer or cto) unless the idea is purely non-technical.',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: IDEA_ROLE_ENUM,
                  },
                  title: { type: 'string', description: 'Specific title e.g. "Technical Co-founder / CTO"' },
                  why: { type: 'string', description: '1-2 sentences specific to THIS idea' },
                  priority: { type: 'number' },
                  is_technical: { type: 'boolean', description: 'true for developer/cto roles' },
                },
                required: ['role', 'title', 'why', 'priority', 'is_technical'],
              },
            },
          },
          required: ['project_summary', 'target_market', 'project_stage', 'recommended_roles'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'analyze_idea_team_gaps' },
    messages: [{ role: 'user', content: context }],
  })

  const toolBlock = response.content.find(b => b.type === 'tool_use')
  if (toolBlock?.type === 'tool_use' && toolBlock.name === 'analyze_idea_team_gaps') {
    const input = toolBlock.input as IdeaAnalysisResult
    return {
      ...input,
      recommended_roles: input.recommended_roles
        .slice(0, 6)
        .sort((a, b) => a.priority - b.priority),
    }
  }

  return {
    project_summary: `${idea.title} is a business idea that needs both technical and non-technical talent to succeed.`,
    target_market: idea.target_market ?? 'To be defined',
    project_stage: 'idea',
    recommended_roles: [
      { role: 'cto', title: 'Technical Co-founder / CTO', why: 'To build the product from the ground up.', priority: 1, is_technical: true },
      { role: 'marketing', title: 'Growth & Marketing', why: 'To validate and grow the audience.', priority: 2, is_technical: false },
      { role: 'business', title: 'Business Development', why: 'To identify partnerships and revenue paths.', priority: 3, is_technical: false },
    ],
  }
}
