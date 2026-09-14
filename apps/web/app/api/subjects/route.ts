import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { subjectsRepo } from '@lifeos/db'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const rows = await subjectsRepo.list(ctx.db, ctx.user.id)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { name?: string; color?: string }
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const row = await subjectsRepo.create(ctx.db, ctx.user.id, { name: body.name, color: body.color })
  return NextResponse.json(row, { status: 201 })
}
