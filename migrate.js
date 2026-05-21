#!/usr/bin/env node
// Runs all Supabase migrations in order against the remote DB
require('./backend/node_modules/dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') })
const { Client } = require('./backend/node_modules/pg')
const fs = require('fs')
const path = require('path')

const PASSWORD = process.env.SUPABASE_DB_PASSWORD
if (!PASSWORD) {
  console.error('Set SUPABASE_DB_PASSWORD to your Supabase database password (Dashboard → Project Settings → Database).')
  process.exit(1)
}
const REF = process.env.SUPABASE_PROJECT_REF || 'voxxnyznweutlmrlgqmy'

const pooler = (region, port = 5432) => ({
  host: `aws-1-${region}.pooler.supabase.com`,
  port,
  user: `postgres.${REF}`,
  password: PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const connectionStrings = [
  pooler('us-west-1', 5432),
  pooler('us-west-1', 6543),
  // Legacy fallbacks
  { host: `aws-0-us-east-1.pooler.supabase.com`, port: 5432, user: `postgres.${REF}`, password: PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false } },
]

async function tryConnect() {
  for (const config of connectionStrings) {
    const client = new Client({ ...config, connectionTimeoutMillis: 8000 })
    try {
      await client.connect()
      console.log(`✓ Connected via ${config.host}`)
      return client
    } catch (e) {
      console.log(`  ✗ ${config.host}: ${e.message.split('\n')[0]}`)
      try { await client.end() } catch {}
    }
  }
  return null
}

async function main() {
  console.log('Connecting to Supabase…\n')
  const client = await tryConnect()

  if (!client) {
    console.error('\n✗ Could not connect via any endpoint.')
    console.error('\nPlease run the migrations manually in the Supabase SQL editor:')
    console.error('  https://supabase.com/dashboard/project/' + REF + '/sql/new\n')
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
