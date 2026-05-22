import crypto from 'crypto'
import { supabaseAdmin } from '../lib/supabase'
import { Message } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

export const CHAT_DAILY_LIMIT = Number(process.env.AI_CHAT_DAILY_LIMIT ?? 2)
export const CHAT_INPUT_TOKEN_LIMIT = Number(process.env.AI_CHAT_INPUT_TOKEN_LIMIT ?? 6000)
export const CHAT_OUTPUT_TOKEN_LIMIT = Number(process.env.AI_CHAT_OUTPUT_TOKEN_LIMIT ?? 700)
const CHAT_CACHE_TTL_DAYS = Number(process.env.AI_CHAT_CACHE_TTL_DAYS ?? 7)

export class ChatQuotaError extends Error {
  status = 429
  resetAt: string

  constructor(resetAt: string) {
    super(`Daily AI chat limit reached. Try again after ${new Date(resetAt).toLocaleString()}.`)
    this.resetAt = resetAt
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function truncateTokens(text: string, maxTokens: number): string {
  if (estimateTokens(text) <= maxTokens) return text
  return text.slice(0, Math.max(0, maxTokens * 4)).trimEnd()
}

function trimHistory(messages: Message[], maxTokens: number): Message[] {
  const trimmed: Message[] = []
  let used = 0

  for (const message of messages.slice(-12).reverse()) {
    const content = truncateTokens(message.content, 500)
    const tokens = estimateTokens(content)
    if (used + tokens > maxTokens) break
    trimmed.unshift({ ...message, content })
    used += tokens
  }

  return trimmed
}

export function prepareChatContext(input: {
  nodeContent: string
  adjacentContext: string
  userProfile: string
  history: Message[]
  userMessage: string
}): {
  nodeContent: string
  adjacentContext: string
  userProfile: string
  history: Message[]
  userMessage: string
  estimatedInputTokens: number
} {
  const budget = CHAT_INPUT_TOKEN_LIMIT
  const userMessage = truncateTokens(input.userMessage, Math.min(900, Math.floor(budget * 0.18)))
  const userProfile = truncateTokens(input.userProfile, Math.min(400, Math.floor(budget * 0.08)))
  const nodeContent = truncateTokens(input.nodeContent, Math.min(2800, Math.floor(budget * 0.46)))
  const adjacentContext = truncateTokens(input.adjacentContext, Math.min(1400, Math.floor(budget * 0.23)))
  const history = trimHistory(input.history, Math.min(1200, Math.floor(budget * 0.2)))

  const estimatedInputTokens =
    estimateTokens(userMessage) +
    estimateTokens(userProfile) +
    estimateTokens(nodeContent) +
    estimateTokens(adjacentContext) +
    history.reduce((sum, message) => sum + estimateTokens(message.content), 0)

  return { nodeContent, adjacentContext, userProfile, history, userMessage, estimatedInputTokens }
}

export function chatCacheKey(input: {
  userId: string
  nodeId: string
  nodeUpdatedAt?: string | null
  nodeContent: string
  adjacentContext: string
  userProfile: string
  history: Message[]
  userMessage: string
}): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
}

export async function getCachedChatResponse(cacheKey: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('ai_chat_response_cache')
    .select('response_text, expires_at')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  return typeof data?.response_text === 'string' ? data.response_text : null
}

export async function cacheChatResponse(params: {
  cacheKey: string
  userId: string
  nodeId: string
  promptTokens: number
  responseText: string
}): Promise<void> {
  const expiresAt = new Date(Date.now() + CHAT_CACHE_TTL_DAYS * DAY_MS).toISOString()
  await supabaseAdmin.from('ai_chat_response_cache').upsert({
    cache_key: params.cacheKey,
    user_id: params.userId,
    node_id: params.nodeId,
    prompt_tokens: params.promptTokens,
    response_text: params.responseText,
    response_tokens: estimateTokens(params.responseText),
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })
}

export async function assertChatQuota(userId: string): Promise<void> {
  const since = new Date(Date.now() - DAY_MS).toISOString()
  const { count } = await supabaseAdmin
    .from('ai_chat_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', 'node_chat')
    .gte('created_at', since)

  if ((count ?? 0) < CHAT_DAILY_LIMIT) return

  const { data: oldest } = await supabaseAdmin
    .from('ai_chat_usage_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('feature', 'node_chat')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const resetAt = new Date(new Date(oldest?.created_at ?? Date.now()).getTime() + DAY_MS).toISOString()
  throw new ChatQuotaError(resetAt)
}

export async function recordChatUsage(params: {
  userId: string
  nodeId: string
  promptTokens: number
  responseTokens: number
  cacheKey: string
}): Promise<void> {
  await supabaseAdmin.from('ai_chat_usage_events').insert({
    user_id: params.userId,
    node_id: params.nodeId,
    feature: 'node_chat',
    prompt_tokens: params.promptTokens,
    response_tokens: params.responseTokens,
    cache_key: params.cacheKey,
  })
}
