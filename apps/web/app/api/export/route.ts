import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { schema } from '@lifeos/db'
import { eq } from 'drizzle-orm'

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

/** Every user-owned table, as one JSON document — the full export the spec asks for. */
export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error

  const result: Record<string, unknown[]> = {}
  for (const table of TABLES) {
    const t = (schema as Record<string, any>)[table]
    result[table] = await ctx.db.select().from(t).where(eq(t.userId, ctx.user.id))
  }

  return NextResponse.json({ exportedAt: new Date().toISOString(), userId: ctx.user.id, data: result })
}
