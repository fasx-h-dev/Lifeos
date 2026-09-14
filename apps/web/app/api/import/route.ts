import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { schema } from '@lifeos/db'

const TABLES = [
  'profiles',
  'subjects',
  'teachers',
  'topics',
  'assignments',
  'exams',
  'studySessions',
  'studyResults',
  'mistakes',
  'resources',
  'opportunities',
  'applications',
  'calendarEvents',
  'businessLeads',
  'contacts',
  'outreach',
  'followUps',
  'aiTasks',
  'approvals',
  'notifications',
  'activityLog',
  'integrations',
  'agentConfigs'
] as const

/** Restores an export produced by GET /api/export. Re-inserts by id with onConflictDoNothing,
 *  so importing the same file twice never duplicates rows — a row that already exists by id
 *  is left as-is rather than inserted again. Every row is re-owned by the current user
 *  regardless of what userId the export file carries. */
export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { data?: Record<string, Record<string, unknown>[]> }
  if (!body.data) return NextResponse.json({ error: 'data is required' }, { status: 400 })

  const counts: Record<string, number> = {}
  for (const table of TABLES) {
    const rows = body.data[table]
    if (!rows || rows.length === 0) continue
    const t = (schema as Record<string, any>)[table]
    const owned = rows.map((r) => ({ ...r, userId: ctx.user.id }))
    const inserted = (await ctx.db.insert(t).values(owned).onConflictDoNothing({ target: t.id }).returning()) as unknown[]
    counts[table] = inserted.length
  }

  return NextResponse.json({ ok: true, counts })
}
