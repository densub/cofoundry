import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

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

// Onboarding profile step: save profile fields only. Graph nodes are created from imports later.
router.post('/onboard', async (req: AuthRequest, res: Response): Promise<void> => {
  const { display_name, role, bio } = req.body

  if (!display_name || !role) {
    res.status(400).json({ error: 'display_name and role are required' })
    return
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ display_name, role, bio })
      .eq('id', req.userId)
      .select()
      .single()

    if (error) { res.status(400).json({ error: error.message }); return }
    res.json(data)
  } catch (err) {
    console.error('Onboarding error:', err)
    res.status(500).json({ error: 'Failed to save profile' })
  }
})

// Mark onboarding complete (profile + GitHub step done or skipped)
router.post('/onboard/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: profile, error: profileError } = await req.supabase!
    .from('profiles')
    .select('display_name, role')
    .eq('id', req.userId)
    .single()

  if (profileError || !profile?.display_name || !profile?.role) {
    res.status(400).json({ error: 'Complete profile setup first' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ is_onboarded: true })
    .eq('id', req.userId)
    .select()
    .single()

  if (error) { res.status(400).json({ error: error.message }); return }
  res.json(data)
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

// Collaborator onboarding: save expertise profile + mark as onboarded
router.post('/onboard/collaborator', async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    display_name,
    headline,
    expertise_tags,
    industries,
    linkedin_url,
    portfolio_url,
    past_ventures,
    skills_description,
    looking_for,
    commitment,
    open_to_equity,
  } = req.body

  if (!display_name || !headline) {
    res.status(400).json({ error: 'display_name and headline are required' })
    return
  }

  const userId = req.userId!

  const [{ error: profileError }, { error: expertiseError }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .update({ display_name, user_type: 'collaborator', is_onboarded: true })
      .eq('id', userId),
    supabaseAdmin
      .from('expertise_profiles')
      .upsert({
        user_id: userId,
        headline,
        expertise_tags: expertise_tags ?? [],
        industries: industries ?? [],
        linkedin_url: linkedin_url ?? null,
        portfolio_url: portfolio_url ?? null,
        past_ventures: past_ventures ?? null,
        skills_description: skills_description ?? null,
        looking_for: looking_for ?? null,
        commitment: commitment ?? null,
        open_to_equity: open_to_equity ?? true,
      }, { onConflict: 'user_id' }),
  ])

  if (profileError || expertiseError) {
    res.status(500).json({ error: profileError?.message ?? expertiseError?.message })
    return
  }

  const { data: updated } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  res.json(updated)
})

export default router
