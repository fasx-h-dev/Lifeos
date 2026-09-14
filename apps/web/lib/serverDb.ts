import 'server-only'
import { getDb as getProdDb, createTestDb, type Database } from '@lifeos/db'

let devDbPromise: ReturnType<typeof createTestDb> | null = null

/**
 * Server-only DB handle. Production (and any deployment with DATABASE_URL set)
 * talks to real Postgres — the Supabase project already provisioned for Auth.
 *
 * Local/dev without a DATABASE_URL falls back to an embedded, in-memory pglite
 * database so `next dev` and preview builds work without any credentials — this
 * path is refused outright in production so it can never silently stand in for
 * a real database there.
 */
export async function getServerDb(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    return getProdDb()
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set. Point it at your Supabase Postgres connection string.')
  }
  if (!devDbPromise) {
    console.warn(
      '[lifeos] DATABASE_URL not set — using an in-memory pglite database for local dev. Data will not persist between restarts.'
    )
    devDbPromise = createTestDb()
  }
  return devDbPromise as unknown as Promise<Database>
}
