import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { getUserGraph, createNode, updateNodeContent } from '../services/graph'
import { generateNodeContent } from '../services/llm'
import { NodeType } from '../types'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()
router.use(authMiddleware)

// Get full graph for the authenticated user
router.get('/graph', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const graph = await getUserGraph(req.userId!, req.supabase!)
    res.json(graph)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch graph' })
  }
})

// Get single node
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const getNodeId = req.params.id as string
  const { data, error } = await req.supabase!
    .from('nodes')
    .select('*')
    .eq('id', getNodeId)
    .single()

  if (error) { res.status(404).json({ error: 'Node not found' }); return }
  res.json(data)
})

// Create a new node (optionally AI-generated)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, title, parent_id, generate = false, additional_context = '' } = req.body

  if (!type || !title) { res.status(400).json({ error: 'type and title required' }); return }
  if (type !== 'project') {
    res.status(400).json({ error: 'Only project nodes are supported — import repos from GitHub under Integrations' })
    return
  }

  try {
    let content = req.body.content ?? ''
    let summary = req.body.summary ?? ''

    if (generate) {
      const { data: profile } = await req.supabase!
        .from('profiles')
        .select('display_name, role, bio')
        .eq('id', req.userId)
        .single()

      const userCtx = `${profile?.display_name ?? ''} — ${profile?.role ?? ''}. ${profile?.bio ?? ''}`
      const md = await generateNodeContent(userCtx, type as NodeType, title, additional_context)
      content = md.content
      summary = md.summary
    }

    const node = await createNode(req.userId!, {
      type: type as NodeType,
      title,
      content,
      summary,
      parentId: parent_id,
    })

    res.status(201).json(node)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create node' })
  }
})

// Update node content
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const nodeId = req.params.id as string
  const { content, summary, title, size_weight } = req.body

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (size_weight !== undefined) updates.size_weight = size_weight

  if (content !== undefined && summary !== undefined) {
    await updateNodeContent(nodeId, content, summary)
  } else if (Object.keys(updates).length > 0) {
    await supabaseAdmin.from('nodes').update(updates).eq('id', nodeId)
  }

  const { data } = await req.supabase!.from('nodes').select('*').eq('id', nodeId).single()
  res.json(data)
})

// Delete a node
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const delId = req.params.id as string
  const { error } = await req.supabase!.from('nodes').delete().eq('id', delId)
  if (error) { res.status(400).json({ error: error.message }); return }
  res.status(204).send()
})

// Create edge between two nodes
router.post('/edges', async (req: AuthRequest, res: Response): Promise<void> => {
  const { from_node_id, to_node_id, relationship_type = 'related', weight = 1.0 } = req.body

  const { data, error } = await supabaseAdmin.from('edges').insert({
    from_node_id,
    to_node_id,
    relationship_type,
    weight,
  }).select().single()

  if (error) { res.status(400).json({ error: error.message }); return }
  res.status(201).json(data)
})

export default router
