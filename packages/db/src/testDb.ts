import { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import * as schema from './schema'
import { MIGRATION_SQLS } from './migrationSql.generated'

/**
 * Embedded, disposable Postgres (pglite, WASM) for tests and local dev without
 * a real Supabase connection string. Same schema, same SQL semantics, no external service.
 *
 * Applies the embedded migration SQL directly (see migrationSql.generated.ts) rather than
 * resolving a migrations folder path at runtime — a folder path built from import.meta.url
 * breaks once this module is bundled by Next.js, since the bundled file no longer lives
 * next to the migrations directory on disk.
 */
export async function createTestDb(): Promise<PgliteDatabase<typeof schema>> {
  const client = new PGlite()
  for (const sql of MIGRATION_SQLS) {
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim()
      if (trimmed) await client.exec(trimmed)
    }
  }
  return drizzle(client, { schema })
}
