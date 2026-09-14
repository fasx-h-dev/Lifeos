import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { AuditLogger } from '@lifeos/core'
import { approvalsRepo } from '@lifeos/db'

/** Generic approve/reject for any approval not covered by a domain-specific route (e.g. /api/outreach/[id]/decide). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const { id } = await params
  const body = (await req.json()) as { decision?: 'APPROVED' | 'REJECTED' }
  if (body.decision !== 'APPROVED' && body.decision !== 'REJECTED') {
    return NextResponse.json({ error: 'decision must be APPROVED or REJECTED' }, { status: 400 })
  }

  const decided = await approvalsRepo.decide(ctx.db, id, ctx.user.id, body.decision, ctx.user.id)
  if (!decided) return NextResponse.json({ error: 'Approval was already decided, or does not exist' }, { status: 409 })

  const audit = new AuditLogger(ctx.auditSink)
  await audit.log({
    agent: 'ApprovalQueue',
    task: 'decide-approval',
    contextState: 'READY',
    action: decided.action,
    status: body.decision === 'APPROVED' ? 'APPROVED' : 'FAILED',
    result: { approvalId: decided.id, decision: body.decision },
    linkedApprovalId: decided.id
  })

  return NextResponse.json(decided)
}
