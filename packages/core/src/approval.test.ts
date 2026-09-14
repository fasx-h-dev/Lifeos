import { describe, it, expect } from 'vitest'
import { createApproval, decideApproval, isDecided } from './approval'

describe('approval state machine', () => {
  it('creates an approval in AWAITING_REVIEW, never pre-approved', () => {
    const approval = createApproval({
      id: 'a1',
      taskId: 't1',
      action: 'external.send_message',
      riskLevel: 'HIGH',
      summary: 'Send outreach email to Acme Corp'
    })
    expect(approval.status).toBe('AWAITING_REVIEW')
    expect(approval.decidedAt).toBeNull()
    expect(isDecided(approval)).toBe(false)
  })

  it('refuses to create an approval for a LOW-risk action', () => {
    expect(() =>
      createApproval({ id: 'a2', taskId: 't2', action: 'assignment.create', riskLevel: 'LOW', summary: 'x' })
    ).toThrow(/auto-execute/)
  })

  it('approving moves status to APPROVED and records who/when', () => {
    const approval = createApproval({
      id: 'a3',
      taskId: 't3',
      action: 'external.submit_application',
      riskLevel: 'HIGH',
      summary: 'Submit scholarship application'
    })
    const decided = decideApproval(approval, 'APPROVED', 'user_123')
    expect(decided.status).toBe('APPROVED')
    expect(decided.decidedBy).toBe('user_123')
    expect(decided.decidedAt).not.toBeNull()
  })

  it('rejecting moves status to REJECTED', () => {
    const approval = createApproval({
      id: 'a4',
      taskId: 't4',
      action: 'ai.draft.outreach',
      riskLevel: 'MEDIUM',
      summary: 'Draft cold outreach'
    })
    const decided = decideApproval(approval, 'REJECTED', 'user_123')
    expect(decided.status).toBe('REJECTED')
  })

  it('a decided approval cannot be decided again — no silent auto-approval on re-run', () => {
    const approval = createApproval({
      id: 'a5',
      taskId: 't5',
      action: 'external.send_message',
      riskLevel: 'HIGH',
      summary: 'x'
    })
    const decided = decideApproval(approval, 'APPROVED', 'user_123')
    expect(() => decideApproval(decided, 'APPROVED', 'user_123')).toThrow(/already decided/)
  })

  it('decideApproval requires an identified decider', () => {
    const approval = createApproval({
      id: 'a6',
      taskId: 't6',
      action: 'external.send_message',
      riskLevel: 'HIGH',
      summary: 'x'
    })
    expect(() => decideApproval(approval, 'APPROVED', '')).toThrow(/decidedBy is required/)
  })
})
