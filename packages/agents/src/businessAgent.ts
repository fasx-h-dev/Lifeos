import { randomUUID } from 'node:crypto'
import { AuditLogger, classifyAction, createApproval, isHighRisk } from '@lifeos/core'
import { leadsRepo, outreachRepo, approvalsRepo } from '@lifeos/db'
import type { AgentDeps, AgentOutcome } from './types'

export type OutreachDraft = { id: string; subject: string | null; body: string; approvalId: string }

/**
 * Drafts an outreach message with AI, then unconditionally lands it in the Approval
 * Queue as HIGH risk — there is no code path here that marks a draft APPROVED or
 * sends it. classifyAction() throws if 'ai.draft.outreach' isn't registered HIGH,
 * which is the enforcement: this function cannot silently downgrade its own risk.
 */
export async function draftOutreach(
  deps: AgentDeps,
  input: { leadId: string; leadName: string; company?: string; goal: string; businessContext: string }
): Promise<AgentOutcome<OutreachDraft>> {
  const action = 'ai.draft.outreach'
  const level = classifyAction(action)
  if (!isHighRisk(level)) {
    throw new Error(`${action} must be classified HIGH — refusing to draft outreach under a weaker risk level`)
  }
  const audit = new AuditLogger(deps.auditSink)

  if (!deps.ai.isConfigured) {
    await audit.log({
      agent: 'BusinessAgent',
      task: 'draft-outreach',
      contextState: 'BLOCKED',
      action,
      status: 'BLOCKED',
      error: 'AI_PROVIDER_NOT_CONFIGURED'
    })
    return { status: 'BLOCKED', reason: 'AI_PROVIDER_NOT_CONFIGURED', instructions: 'Set OPENAI_API_KEY in the API environment.' }
  }

  const generated = await deps.ai.generate({
    context: input.businessContext,
    prompt: `Draft a short, genuine cold-outreach email to ${input.leadName}${input.company ? ` at ${input.company}` : ''}. Goal: ${input.goal}. Return only the email body.`,
    tier: 'reasoning'
  })

  if (generated.status === 'AI_PROVIDER_NOT_CONFIGURED') {
    return { status: 'BLOCKED', reason: generated.reason }
  }
  if (generated.status === 'FAILED') {
    await audit.log({
      agent: 'BusinessAgent',
      task: 'draft-outreach',
      contextState: 'FAILED',
      action,
      status: 'FAILED',
      error: generated.error
    })
    return { status: 'FAILED', error: generated.error }
  }

  const outreachRow = await outreachRepo.create(deps.db, deps.userId, {
    leadId: input.leadId,
    draftBody: generated.data
  })

  const approval = createApproval({
    id: randomUUID(),
    taskId: outreachRow.id,
    action,
    riskLevel: level,
    summary: `Send outreach email to ${input.leadName}${input.company ? ` (${input.company})` : ''}`
  })
  const savedApproval = await approvalsRepo.create(deps.db, deps.userId, {
    taskRef: outreachRow.id,
    action,
    riskLevel: 'HIGH',
    summary: approval.summary,
    payload: { outreachId: outreachRow.id }
  })

  await audit.log({
    agent: 'BusinessAgent',
    task: 'draft-outreach',
    contextState: 'AWAITING_REVIEW',
    action,
    status: 'AWAITING_REVIEW',
    result: { outreachId: outreachRow.id, usage: generated.usage },
    linkedApprovalId: savedApproval.id
  })

  return {
    status: 'AWAITING_REVIEW',
    approvalId: savedApproval.id,
    data: { id: outreachRow.id, subject: outreachRow.draftSubject, body: outreachRow.draftBody, approvalId: savedApproval.id }
  }
}

/**
 * Deciding an outreach draft. Approving it does NOT send anything — there is no
 * email provider wired up yet, so even an APPROVED outreach stays un-sent until
 * sendOutreach() below has a real provider to call.
 */
export async function decideOutreach(
  deps: AgentDeps,
  input: { outreachId: string; approvalId: string; decision: 'APPROVED' | 'REJECTED'; decidedBy: string }
): Promise<AgentOutcome<{ outreachId: string; status: 'APPROVED' | 'REJECTED' }>> {
  const audit = new AuditLogger(deps.auditSink)

  const decidedApproval = await approvalsRepo.decide(deps.db, input.approvalId, deps.userId, input.decision, input.decidedBy)
  if (!decidedApproval) {
    return { status: 'FAILED', error: 'Approval was already decided, or does not exist — decisions cannot be replayed' }
  }

  await outreachRepo.markDecision(deps.db, input.outreachId, deps.userId, input.decision, decidedApproval.id)

  await audit.log({
    agent: 'BusinessAgent',
    task: 'decide-outreach',
    contextState: 'READY',
    action: 'ai.draft.outreach',
    status: input.decision === 'APPROVED' ? 'APPROVED' : 'FAILED',
    result: { outreachId: input.outreachId, decision: input.decision },
    linkedApprovalId: decidedApproval.id
  })

  return { status: 'COMPLETED', data: { outreachId: input.outreachId, status: input.decision } }
}

/** No email provider is wired up yet — this always reports the real blocked state, never a fake send. */
export async function sendOutreach(deps: AgentDeps, _input: { outreachId: string }): Promise<AgentOutcome<never>> {
  const audit = new AuditLogger(deps.auditSink)
  await audit.log({
    agent: 'BusinessAgent',
    task: 'send-outreach',
    contextState: 'BLOCKED',
    action: 'external.send_email',
    status: 'BLOCKED',
    error: 'EMAIL_PROVIDER_NOT_CONFIGURED'
  })
  return {
    status: 'BLOCKED',
    reason: 'EMAIL_PROVIDER_NOT_CONFIGURED',
    instructions: 'Connect Gmail API or SendGrid and set the corresponding env vars before outreach can actually send.'
  }
}

export async function createLead(
  deps: AgentDeps,
  input: { name: string; company?: string; email?: string; phone?: string; notes?: string }
) {
  const audit = new AuditLogger(deps.auditSink)
  const lead = await leadsRepo.create(deps.db, deps.userId, input)
  await audit.log({
    agent: 'BusinessAgent',
    task: 'create-lead',
    contextState: 'READY',
    action: 'lead.create',
    status: 'COMPLETED',
    result: { leadId: lead.id }
  })
  return lead
}
