import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { extractAndCreateAssignment } from '@lifeos/agents'

/** The School Agent pipeline: raw pasted text -> AI extract -> Context Gate -> store. */
export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { rawText?: string; subjectId?: string; teacherId?: string }
  if (!body.rawText) return NextResponse.json({ error: 'rawText is required' }, { status: 400 })

  const outcome = await extractAndCreateAssignment(
    { db: ctx.db, userId: ctx.user.id, ai: ctx.ai, auditSink: ctx.auditSink },
    { rawText: body.rawText, subjectId: body.subjectId, teacherId: body.teacherId }
  )
  return NextResponse.json(outcome)
}
