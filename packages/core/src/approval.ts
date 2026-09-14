import type { Approval, PermissionLevel } from './types'

export type CreateApprovalInput = {
  id: string
  taskId: string
  action: string
  riskLevel: PermissionLevel
  summary: string
}

/** Approvals always start AWAITING_REVIEW. There is no path that creates one pre-approved. */
export function createApproval(input: CreateApprovalInput): Approval {
  if (input.riskLevel === 'LOW') {
    throw new Error('LOW-risk actions auto-execute and never go through the approval queue')
  }
  return {
    id: input.id,
    taskId: input.taskId,
    action: input.action,
    riskLevel: input.riskLevel,
    status: 'AWAITING_REVIEW',
    summary: input.summary,
    createdAt: new Date().toISOString(),
    decidedAt: null,
    decidedBy: null
  }
}

/**
 * Decide an approval. Silence is never approval — there is no "expire to approved" path,
 * only an explicit APPROVED or REJECTED decision by an identified actor.
 */
export function decideApproval(
  approval: Approval,
  decision: 'APPROVED' | 'REJECTED',
  decidedBy: string
): Approval {
  if (approval.status !== 'AWAITING_REVIEW') {
    throw new Error(
      `Approval ${approval.id} was already decided (${approval.status} by ${approval.decidedBy}); decisions cannot be changed after the fact`
    )
  }
  if (!decidedBy) {
    throw new Error('decidedBy is required — an approval decision must be attributable to someone')
  }
  return {
    ...approval,
    status: decision,
    decidedAt: new Date().toISOString(),
    decidedBy
  }
}

export function isDecided(approval: Approval): boolean {
  return approval.status !== 'AWAITING_REVIEW'
}
