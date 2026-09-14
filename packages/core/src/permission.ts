import type { PermissionLevel } from './types'

/**
 * Every action an agent can take must be explicitly classified here.
 * Unknown actions throw rather than silently defaulting to a low-risk level —
 * that default would be exactly the kind of bypass this model exists to prevent.
 */
const ACTION_REGISTRY: Record<string, PermissionLevel> = {
  // LOW — auto-executes
  'assignment.create': 'LOW',
  'assignment.update_status': 'LOW',
  'assignment.delete': 'LOW',
  'exam.create': 'LOW',
  'studyplan.generate': 'LOW',
  'calendar.aggregate': 'LOW',
  'opportunity.status_transition': 'LOW',
  'lead.create': 'LOW',
  'notification.internal_reminder': 'LOW',

  // an AI-generated explanation the user directly and synchronously asked for: nothing is
  // written or sent, so it auto-executes like any other read/calculation
  'ai.explain.topic': 'LOW',

  // extracting an assignment from pasted text is still just "create my own personal record" —
  // an internal DB write. The Context Gate (not the Approval Queue) is what keeps it honest:
  // READY auto-creates, NEEDS_INFO/UNCERTAIN persist nothing. See packages/agents/schoolAgent.ts.
  'ai.draft.assignment_extract': 'LOW',

  // MEDIUM — schedule edits (writes to a shared/external calendar), created AWAITING_REVIEW by default
  'schedule.edit': 'MEDIUM',
  'calendar.sync_write': 'MEDIUM',

  // HIGH — external submissions/messages, irreversible actions; always explicit approval.
  // Outreach drafts are HIGH (not MEDIUM) because approving one is the last gate before a
  // message to a real external person — the draft step itself carries that risk.
  'ai.draft.outreach': 'HIGH',
  'external.submit_application': 'HIGH',
  'external.send_message': 'HIGH',
  'external.send_email': 'HIGH',
  'external.irreversible_action': 'HIGH',
  'integration.connect': 'HIGH'
}

export function registerAction(action: string, level: PermissionLevel): void {
  ACTION_REGISTRY[action] = level
}

export function classifyAction(action: string): PermissionLevel {
  const level = ACTION_REGISTRY[action]
  if (!level) {
    throw new Error(
      `Unknown action "${action}" — every action must be explicitly classified LOW/MEDIUM/HIGH before it can run. Call registerAction() to add it.`
    )
  }
  return level
}

export function canAutoExecute(level: PermissionLevel): boolean {
  return level === 'LOW'
}

export function requiresApproval(level: PermissionLevel): boolean {
  return level === 'MEDIUM' || level === 'HIGH'
}

export function isHighRisk(level: PermissionLevel): boolean {
  return level === 'HIGH'
}
