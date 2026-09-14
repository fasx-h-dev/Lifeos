import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { decideOutreach } from '@lifeos/agents'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const { id } = await params
  const body = (await req.json()) as { approvalId?: string; decision?: 'APPROVED' | 'REJECTED' }
  if (!body.approvalId || !body.decision) return NextResponse.json({ error: 'approvalId and decision are required' }, { status: 400 })
  const outcome = await decideOutreach(
    { db: ctx.db, userId: ctx.user.id, ai: ctx.ai, auditSink: ctx.auditSink },
    { outreachId: id, approvalId: body.approvalId, decision: body.decision, decidedBy: ctx.user.id }
  )
  return NextResponse.json(outcome)
}
