import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { createLead } from '@lifeos/agents'
import { leadsRepo } from '@lifeos/db'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const rows = await leadsRepo.list(ctx.db, ctx.user.id)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { name?: string; company?: string; email?: string; phone?: string; notes?: string }
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const row = await createLead({ db: ctx.db, userId: ctx.user.id, ai: ctx.ai, auditSink: ctx.auditSink }, body as { name: string })
  return NextResponse.json(row, { status: 201 })
}
