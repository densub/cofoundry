import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { generateRootNode } from '../services/llm'
import { createNode } from '../services/graph'

const router = Router()
router.use(authMiddleware)

router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data, error } = await req.supabase!
    .from('profiles')
    .select('*')
    .eq('id', req.userId)
    .single()

  if (error) { res.status(404).json({ error: 'Profile not found' }); return }
  res.json(data)
})

router.put('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const { display_name, username, role, bio, avatar_url } = req.body

  const { data, error } = await req.supabase!
    .from('profiles')
    .update({ display_name, username, role, bio, avatar_url })
    .eq('id', req.userId)
    .select()
    .single()

  if (error) { res.status(400).json({ error: error.message }); return }
  res.json(data)
})

// Onboarding: profile + root node only — projects come from GitHub import
router.post('/onboard', async (req: AuthRequest, res: Response): Promise<void> => {
  const { display_name, role, bio } = req.body

  if (!display_name || !role) {
    res.status(400).json({ error: 'display_name and role are required' })
    return
  }

  try {
    await supabaseAdmin.from('profiles').update({ display_name, role, bio }).eq('id', req.userId)

    const rootMd = await generateRootNode(display_name, role, bio ?? '')
    const rootNode = await createNode(req.userId!, {
      type: 'root',
      title: `${display_name}'s Knowledge Graph`,
      content: rootMd.content,
      summary: rootMd.summary,
      isRoot: true,
      sizeWeight: 2.0,
    })

    await supabaseAdmin.from('profiles').update({ is_onboarded: true }).eq('id', req.userId)

    res.json({ rootNode, childNodes: [] })
  } catch (err) {
    console.error('Onboarding error:', err)
    res.status(500).json({ error: 'Failed to generate knowledge graph' })
  }
})

// Permanently delete auth user + all app data (DB cascades from profiles / auth.users)
router.post('/delete-account', async (req: AuthRequest, res: Response): Promise<void> => {
  const { confirm } = req.body as { confirm?: string }
  if (confirm !== 'DELETE') {
    res.status(400).json({ error: 'Type DELETE in confirm to permanently delete your account' })
    return
  }

  const userId = req.userId!
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    console.error('Delete account error:', error)
    res.status(500).json({ error: 'Failed to delete account' })
    return
  }

  res.status(204).send()
})

export default router
