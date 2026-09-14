import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { opportunitiesRepo } from '@lifeos/db'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const rows = await opportunitiesRepo.list(ctx.db, ctx.user.id)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { title?: string; org?: string; type?: string; url?: string; deadline?: string; description?: string }
  if (!body.title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  const row = await opportunitiesRepo.create(ctx.db, ctx.user.id, {
    title: body.title,
    org: body.org,
    type: body.type,
    url: body.url,
    deadline: body.deadline ? new Date(body.deadline) : undefined,
    description: body.description
  })
  return NextResponse.json(row, { status: 201 })
}
