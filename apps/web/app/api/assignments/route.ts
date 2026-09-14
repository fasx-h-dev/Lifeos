import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { assignmentsRepo } from '@lifeos/db'
import { createAssignmentDirect } from '@lifeos/agents'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const rows = await assignmentsRepo.list(ctx.db, ctx.user.id)
  return NextResponse.json(rows)
}

/** Direct (non-AI) creation — still runs through the Context Gate: missing title -> NEEDS_INFO, nothing written. */
export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as {
    title?: string
    instructions?: string
    dueDate?: string
    subjectId?: string
    teacherId?: string
    priority?: number
  }
  const outcome = await createAssignmentDirect(
    { db: ctx.db, userId: ctx.user.id, ai: ctx.ai, auditSink: ctx.auditSink },
    { title: body.title, instructions: body.instructions, dueDate: body.dueDate ? new Date(body.dueDate) : undefined, subjectId: body.subjectId, teacherId: body.teacherId, priority: body.priority }
  )
  return NextResponse.json(outcome, { status: outcome.status === 'COMPLETED' ? 201 : 200 })
}
