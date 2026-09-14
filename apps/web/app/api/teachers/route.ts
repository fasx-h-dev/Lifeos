import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { teachersRepo } from '@lifeos/db'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const rows = await teachersRepo.list(ctx.db, ctx.user.id)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as {
    name?: string
    subjectId?: string
    role?: 'teacher' | 'tutor'
    email?: string
    phone?: string
    notes?: string
  }
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const row = await teachersRepo.create(ctx.db, ctx.user.id, {
    name: body.name,
    subjectId: body.subjectId,
    role: body.role,
    email: body.email,
    phone: body.phone,
    notes: body.notes
  })
  return NextResponse.json(row, { status: 201 })
}
