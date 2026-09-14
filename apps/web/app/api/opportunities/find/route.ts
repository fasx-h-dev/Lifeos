import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { findOpportunities } from '@lifeos/agents'

export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { query?: string }
  if (!body.query) return NextResponse.json({ error: 'query is required' }, { status: 400 })
  const outcome = await findOpportunities({ auditSink: ctx.auditSink, userId: ctx.user.id }, body.query)
  return NextResponse.json(outcome)
}
