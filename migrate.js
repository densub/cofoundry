#!/usr/bin/env node
// Runs all Supabase migrations in order against the remote DB
require('./backend/node_modules/dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') })
const { Client } = require('./backend/node_modules/pg')
const fs = require('fs')
const path = require('path')

function getSupabaseEnv() {
  const raw = process.env.SUPABASE_ENV?.toUpperCase()
  if (raw === 'TEST' || raw === 'PROD') return raw
  return process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST'
}

function databaseUrlForEnv(supabaseEnv) {
  const named = process.env[`SUPABASE_DATABASE_URL_${supabaseEnv}`]?.trim()
  if (named) return named
  return process.env.DATABASE_URL?.trim() || null
}

function projectRefFromUrl(url) {
  if (!url) return null
  const fromApi = url.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (fromApi) return fromApi
  try {
    const u = new URL(url.replace(/^postgresql:/, 'postgres:'))
    const user = decodeURIComponent(u.username || '')
    const m = user.match(/^postgres\.(.+)$/)
    if (m) return m[1]
  } catch {
    /* ignore */
  }
  return null
}

const supabaseEnv = getSupabaseEnv()
const databaseUrl = databaseUrlForEnv(supabaseEnv)
const supabaseUrl = process.env[`SUPABASE_URL_${supabaseEnv}`]
const REF =
  process.env.SUPABASE_PROJECT_REF ||
  projectRefFromUrl(supabaseUrl) ||
  projectRefFromUrl(databaseUrl) ||
  'voxxnyznweutlmrlgqmy'

console.log(`Using Supabase ${supabaseEnv} (project ${REF})`)

const PASSWORD = process.env[`SUPABASE_DB_${supabaseEnv}_PASSWORD`]

const pooler = (region, port = 5432) => ({
  host: `aws-1-${region}.pooler.supabase.com`,
  port,
  user: `postgres.${REF}`,
  password: PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const poolerLegacy = (region, port = 5432) => ({
  host: `aws-0-${region}.pooler.supabase.com`,
  port,
  user: `postgres.${REF}`,
  password: PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const legacyConnectionConfigs = PASSWORD
  ? [
      pooler('us-west-2', 5432),
      pooler('us-west-2', 6543),
      pooler('us-west-1', 5432),
      pooler('us-west-1', 6543),
      pooler('us-east-1', 5432),
      poolerLegacy('us-east-1', 5432),
      {
        host: `db.${REF}.supabase.co`,
        port: 5432,
        user: 'postgres',
        password: PASSWORD,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
      },
    ]
  : []

async function connectWithUrl(connectionString) {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  let host = connectionString
  try {
    host = new URL(connectionString.replace(/^postgresql:/, 'postgres:')).host
  } catch {
    /* ignore */
  }
  console.log(`✓ Connected via database URL (${host})`)
  return client
}

async function tryLegacyConnect() {
  for (const config of legacyConnectionConfigs) {
    const client = new Client({ ...config, connectionTimeoutMillis: 8000 })
    try {
      await client.connect()
      console.log(`✓ Connected via ${config.host}`)
      return client
    } catch (e) {
      console.log(`  ✗ ${config.host}: ${e.message.split('\n')[0]}`)
      try {
        await client.end()
      } catch {
        /* ignore */
      }
    }
  }
  return null
}

async function connect() {
  if (databaseUrl) {
    try {
      return await connectWithUrl(databaseUrl)
    } catch (e) {
      console.error(`✗ Database URL connection failed: ${e.message.split('\n')[0]}`)
      return null
    }
  }

  if (!PASSWORD) {
    console.error(
      `Set SUPABASE_DATABASE_URL_${supabaseEnv} (recommended) or SUPABASE_DB_${supabaseEnv}_PASSWORD.`,
    )
    console.error(
      'Copy the Session pooler URI from Supabase → Project Settings → Database → Connection string.',
    )
    process.exit(1)
  }

  console.log('No database URL set — trying legacy pooler endpoints…\n')
  return tryLegacyConnect()
}

async function main() {
  console.log('Connecting to Supabase…\n')
  const client = await connect()

  if (!client) {
    console.error('\n✗ Could not connect to the database.')
    console.error('\nSet SUPABASE_DATABASE_URL_PROD to the full connection string from Supabase, e.g.:')
    console.error(
      '  postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres',
    )
    console.error('\nOr run migrations manually in the Supabase SQL editor:')
    console.error(`  https://supabase.com/dashboard/project/${REF}/sql/new\n`)
    process.exit(1)
  }

  const migrationsDir = path.join(__dirname, 'supabase', 'migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`\nRunning ${file}…`)
    try {
      await client.query(sql)
      console.log(`  ✓ Done`)
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log(`  ⚠ Skipped (already applied): ${e.message.split('\n')[0]}`)
      } else {
        console.error(`  ✗ Error: ${e.message}`)
        await client.end()
        process.exit(1)
      }
    }
  }

  await client.end()
  console.log('\n✓ All migrations complete.')
}

main().catch(console.error)
