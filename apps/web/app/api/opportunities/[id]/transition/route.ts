import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { transitionOpportunity, type OpportunityStatus } from '@lifeos/agents'
import { opportunitiesRepo } from '@lifeos/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const { id } = await params
  const body = (await req.json()) as { to?: OpportunityStatus }
  if (!body.to) return NextResponse.json({ error: 'to is required' }, { status: 400 })

  // The current status always comes from the DB, never from the client — otherwise a
  // caller could claim any "from" that happens to make an illegal transition pass.
  const rows = await opportunitiesRepo.list(ctx.db, ctx.user.id)
  const current = rows.find((r) => r.id === id)
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const outcome = await transitionOpportunity(
    { db: ctx.db, userId: ctx.user.id, ai: ctx.ai, auditSink: ctx.auditSink },
    { id, from: current.status as OpportunityStatus, to: body.to }
  )
  return NextResponse.json(outcome)
}
