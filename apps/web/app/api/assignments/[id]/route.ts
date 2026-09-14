import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { assignmentsRepo } from '@lifeos/db'
import { verifyOptionalRefs } from '@/lib/ownership'

type AssignmentPatchBody = {
  title?: string
  instructions?: string
  dueDate?: string | null
  priority?: number
  status?: 'todo' | 'in_progress' | 'done'
  subjectId?: string | null
  teacherId?: string | null
}

/** Whitelisted fields only — the body is client-supplied JSON, so userId/id/contextState etc.
 *  must never pass through untouched (that would let a caller reassign ownership or forge state). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const { id } = await params
  const body = (await req.json()) as AssignmentPatchBody

  const refError = await verifyOptionalRefs(ctx.db, ctx.user.id, { subjectId: body.subjectId, teacherId: body.teacherId })
  if (refError) return NextResponse.json({ error: refError }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.instructions !== undefined) updates.instructions = body.instructions
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.status !== undefined) updates.status = body.status
  if (body.subjectId !== undefined) updates.subjectId = body.subjectId
  if (body.teacherId !== undefined) updates.teacherId = body.teacherId

  const row = await assignmentsRepo.update(ctx.db, id, ctx.user.id, updates as never)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const { id } = await params
  await assignmentsRepo.remove(ctx.db, id, ctx.user.id)
  return NextResponse.json({ ok: true })
}
