import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema>

let pool: Pool | undefined
let cached: Database | undefined

/**
 * Production/dev database handle, backed by whatever Postgres DATABASE_URL points at
 * (this project uses the Supabase Postgres instance already provisioned for Auth).
 * Throws loudly if DATABASE_URL is missing rather than silently falling back —
 * callers that can tolerate no DB (tests) should use packages/db/testDb instead.
 */
export function getDb(): Database {
  if (cached) return cached
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Set it to your Supabase Postgres connection string (Project Settings -> Database -> Connection string -> URI).'
    )
  }
  pool = new Pool({ connectionString })
  cached = drizzlePg(pool, { schema })
  return cached
}

export async function closeDb(): Promise<void> {
  await pool?.end()
  pool = undefined
  cached = undefined
}
