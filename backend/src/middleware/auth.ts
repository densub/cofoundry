import { Request, Response, NextFunction } from 'express'
import { createUserClient } from '../lib/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
  supabase?: SupabaseClient
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Missing auth token' })
    return
  }

  const client = createUserClient(token)
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    res.status(401).json({ error: 'Invalid auth token' })
    return
  }

  req.userId = user.id
  req.userEmail = user.email
  req.supabase = client
  next()
}
