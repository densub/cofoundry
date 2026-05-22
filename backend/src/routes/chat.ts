import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { streamNodeChat, parseNodeOperations } from '../services/llm'
import { createNode } from '../services/graph'
import { NodeType, Message } from '../types'
import { supabaseAdmin } from '../lib/supabase'
import { projectContextFromNode } from '../services/projectContext'
import {
  assertChatQuota,
  cacheChatResponse,
  chatCacheKey,
  ChatQuotaError,
  CHAT_OUTPUT_TOKEN_LIMIT,
  estimateTokens,
  getCachedChatResponse,
  prepareChatContext,
  recordChatUsage,
} from '../services/chatUsage'

const router = Router()
router.use(authMiddleware)

function githubProjectPromptContext(node: {
  title: string
  summary: string | null
  content: string | null
  metadata?: Record<string, unknown> | null
}): string {
  const project = projectContextFromNode(node)
  const lines = [
    `Title: ${project.title}`,
    `Source: ${project.source === 'github' ? 'GitHub repository' : 'Project graph'}`,
    `Stack/topics: ${project.stack}`,
    `Description: ${project.description || 'No description provided.'}`,
  ]
  if (project.url) lines.push(`URL: ${project.url}`)
  return lines.join('\n')
}

// Stream chat for a specific node
router.post('/:nodeId/stream', async (req: AuthRequest, res: Response): Promise<void> => {
  const { messages = [], message } = req.body

  if (!message) { res.status(400).json({ error: 'message is required' }); return }

  // Load node
  const nodeId = req.params.nodeId as string
  const { data: node, error } = await req.supabase!
    .from('nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('user_id', req.userId)
    .single()

  if (error || !node) { res.status(404).json({ error: 'Node not found' }); return }
  if (node.type !== 'project' || !(node.metadata as Record<string, unknown> | null)?.github) {
    res.status(403).json({ error: 'Chat is only available for your own GitHub project nodes.' })
    return
  }

  const nodeProjectContext = githubProjectPromptContext(node)
  const prepared = prepareChatContext({
    nodeContent: nodeProjectContext,
    adjacentContext: '',
    userProfile: '',
    history: messages as Message[],
    userMessage: message,
  })
  const cacheKey = chatCacheKey({
    userId: req.userId!,
    nodeId,
    nodeUpdatedAt: node.updated_at,
    nodeContent: prepared.nodeContent,
    adjacentContext: '',
    userProfile: '',
    history: prepared.history,
    userMessage: prepared.userMessage,
  })

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  let fullResponse = ''

  try {
    const cachedResponse = await getCachedChatResponse(cacheKey)
    if (cachedResponse) {
      fullResponse = cachedResponse
      res.write(`data: ${JSON.stringify({ cached: true })}\n\n`)
      res.write(`data: ${JSON.stringify({ text: cachedResponse })}\n\n`)
    } else {
      await assertChatQuota(req.userId!)

    for await (const chunk of streamNodeChat(
      prepared.nodeContent,
      prepared.adjacentContext,
      prepared.userProfile,
      prepared.history,
      prepared.userMessage,
      { maxOutputTokens: CHAT_OUTPUT_TOKEN_LIMIT }
    )) {
      fullResponse += chunk
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
    }

      await cacheChatResponse({
        cacheKey,
        userId: req.userId!,
        nodeId,
        promptTokens: prepared.estimatedInputTokens,
        responseText: fullResponse,
      })
      await recordChatUsage({
        userId: req.userId!,
        nodeId,
        promptTokens: prepared.estimatedInputTokens,
        responseTokens: estimateTokens(fullResponse),
        cacheKey,
      })
    }

    // Parse and return any suggested operations
    const operations = parseNodeOperations(fullResponse)
    if (operations) {
      res.write(`data: ${JSON.stringify({ operations })}\n\n`)
    }

    // Persist conversation
    const updatedMessages: Message[] = [
      ...messages,
      { role: 'user', content: prepared.userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
    ]

    const convId = req.body.conversation_id
    if (convId) {
      await supabaseAdmin.from('conversations').update({ messages: updatedMessages }).eq('id', convId)
    } else {
      await supabaseAdmin.from('conversations').insert({
        user_id: req.userId,
        node_id: nodeId,
        title: `Chat: ${node.title}`,
        messages: updatedMessages,
      })
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const isQuota = err instanceof ChatQuotaError
    res.write(`data: ${JSON.stringify({
      error: isQuota ? err.message : 'Stream failed',
      code: isQuota ? 'AI_CHAT_QUOTA_EXCEEDED' : 'STREAM_FAILED',
      resetAt: isQuota ? err.resetAt : undefined,
    })}\n\n`)
    res.end()
  }
})

// Accept a node operation suggested by the AI
router.post('/:nodeId/operations', async (req: AuthRequest, res: Response): Promise<void> => {
  const opNodeId = req.params.nodeId as string
  const { operation } = req.body
  const { data: parentNode } = await req.supabase!
    .from('nodes')
    .select('*')
    .eq('id', opNodeId)
    .single()

  if (!parentNode) { res.status(404).json({ error: 'Node not found' }); return }

  try {
    const { data: profile } = await req.supabase!
      .from('profiles')
      .select('display_name, role, bio')
      .eq('id', req.userId)
      .single()

    const { generateNodeContent } = await import('../services/llm')
    const userCtx = `${profile?.display_name ?? ''} — ${profile?.role ?? ''}. ${profile?.bio ?? ''}`
    const md = await generateNodeContent(userCtx, operation.nodeType as NodeType, operation.title, operation.reason)

    const newNode = await createNode(req.userId!, {
      type: operation.nodeType as NodeType,
      title: operation.title,
      content: md.content,
      summary: md.summary,
      parentId: opNodeId,
    })

    // Update parent's size_weight to reflect expansion
    await supabaseAdmin.from('nodes').update({ size_weight: Math.min(parentNode.size_weight + 0.2, 3.0) }).eq('id', opNodeId)

    res.status(201).json(newNode)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create node from operation' })
  }
})

// Get conversation history for a node
router.get('/:nodeId/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  const convNodeId = req.params.nodeId as string
  const { data } = await req.supabase!
    .from('conversations')
    .select('*')
    .eq('node_id', convNodeId)
    .order('created_at', { ascending: false })
    .limit(10)

  res.json(data ?? [])
})

export default router
