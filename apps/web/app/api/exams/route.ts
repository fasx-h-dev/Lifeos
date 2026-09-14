import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { examsRepo } from '@lifeos/db'
import { verifyOptionalRefs } from '@/lib/ownership'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const rows = await examsRepo.list(ctx.db, ctx.user.id)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { title?: string; examDate?: string; subjectId?: string; weight?: number; notes?: string }
  if (!body.title || !body.examDate) return NextResponse.json({ error: 'title and examDate are required' }, { status: 400 })

  const refError = await verifyOptionalRefs(ctx.db, ctx.user.id, { subjectId: body.subjectId })
  if (refError) return NextResponse.json({ error: refError }, { status: 400 })

  const row = await examsRepo.create(ctx.db, ctx.user.id, {
    title: body.title,
    examDate: new Date(body.examDate),
    subjectId: body.subjectId,
    weight: body.weight,
    notes: body.notes
  })
  return NextResponse.json(row, { status: 201 })
}
