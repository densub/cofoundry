import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import profileRoutes from './routes/profile'
import nodeRoutes from './routes/nodes'
import chatRoutes from './routes/chat'
import matchingRoutes from './routes/matching'
import integrationRoutes from './routes/integrations'
import connectionRoutes from './routes/connections'
import teamRoutes from './routes/team'
import { getSupabaseEnv } from './lib/supabaseConfig'
import http from 'http'
import { attachProjectChatWSServer } from './ws/projectChat'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/profile', profileRoutes)
app.use('/api/nodes', nodeRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/matching', matchingRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/connections', connectionRoutes)
app.use('/api/team', teamRoutes)

const server = http.createServer(app)
attachProjectChatWSServer(server)

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Backend running on http://0.0.0.0:${PORT} (Supabase: ${getSupabaseEnv()})`)
  console.log(`WS project chat: ws://0.0.0.0:${PORT}/ws/project-chat`)
})
