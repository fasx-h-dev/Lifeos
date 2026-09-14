import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { draftOutreach } from '@lifeos/agents'
import { outreachRepo, leadsRepo } from '@lifeos/db'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const rows = await outreachRepo.list(ctx.db, ctx.user.id)
  return NextResponse.json(rows)
}

/** Always lands AWAITING_REVIEW as HIGH risk — see packages/agents/businessAgent.ts. */
export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { leadId?: string; goal?: string; businessContext?: string }
  if (!body.leadId || !body.goal) return NextResponse.json({ error: 'leadId and goal are required' }, { status: 400 })

  const leads = await leadsRepo.list(ctx.db, ctx.user.id)
  const lead = leads.find((l) => l.id === body.leadId)
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const outcome = await draftOutreach(
    { db: ctx.db, userId: ctx.user.id, ai: ctx.ai, auditSink: ctx.auditSink },
    { leadId: lead.id, leadName: lead.name, company: lead.company ?? undefined, goal: body.goal, businessContext: body.businessContext ?? '' }
  )
  return NextResponse.json(outcome)
}
