import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { streamNodeChat, parseNodeOperations } from '../services/llm'
import { createNode, getAdjacentContext } from '../services/graph'
import { NodeType, Message } from '../types'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()
router.use(authMiddleware)

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
    .single()

  if (error || !node) { res.status(404).json({ error: 'Node not found' }); return }

  const { data: profile } = await req.supabase!
    .from('profiles')
    .select('display_name, role, bio')
    .eq('id', req.userId)
    .single()

  const userProfile = `${profile?.display_name ?? 'User'} — ${profile?.role ?? ''}. ${profile?.bio ?? ''}`
  const adjacentContext = await getAdjacentContext(nodeId)

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  let fullResponse = ''

  try {
    for await (const chunk of streamNodeChat(
      node.content,
      adjacentContext,
      userProfile,
      messages as Message[],
      message
    )) {
      fullResponse += chunk
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
    }

    // Parse and return any suggested operations
    const operations = parseNodeOperations(fullResponse)
    if (operations) {
      res.write(`data: ${JSON.stringify({ operations })}\n\n`)
    }

    // Persist conversation
    const updatedMessages: Message[] = [
      ...messages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
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
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
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
