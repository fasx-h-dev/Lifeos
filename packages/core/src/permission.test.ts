import { describe, it, expect } from 'vitest'
import { classifyAction, canAutoExecute, requiresApproval, isHighRisk, registerAction } from './permission'

describe('permission model', () => {
  it('classifies known LOW/MEDIUM/HIGH actions correctly', () => {
    expect(classifyAction('assignment.create')).toBe('LOW')
    // extracting an assignment is an internal DB write gated by the Context Gate, not the
    // Approval Queue — see packages/agents/schoolAgent.ts
    expect(classifyAction('ai.draft.assignment_extract')).toBe('LOW')
    expect(classifyAction('schedule.edit')).toBe('MEDIUM')
    // outreach drafts are HIGH, not MEDIUM: approving one is the last gate before a
    // message to a real external person, so the draft step itself carries that risk
    expect(classifyAction('ai.draft.outreach')).toBe('HIGH')
    expect(classifyAction('external.send_message')).toBe('HIGH')
  })

  it('throws on an unclassified action instead of defaulting to a safe level', () => {
    expect(() => classifyAction('totally.unknown.action')).toThrow(/Unknown action/)
  })

  it('LOW auto-executes, MEDIUM and HIGH require approval', () => {
    expect(canAutoExecute('LOW')).toBe(true)
    expect(canAutoExecute('MEDIUM')).toBe(false)
    expect(canAutoExecute('HIGH')).toBe(false)

    expect(requiresApproval('LOW')).toBe(false)
    expect(requiresApproval('MEDIUM')).toBe(true)
    expect(requiresApproval('HIGH')).toBe(true)
  })

  it('flags HIGH as high risk and MEDIUM/LOW as not', () => {
    expect(isHighRisk('HIGH')).toBe(true)
    expect(isHighRisk('MEDIUM')).toBe(false)
    expect(isHighRisk('LOW')).toBe(false)
  })

  it('registerAction lets new actions be classified without editing the registry inline', () => {
    registerAction('test.custom_action', 'HIGH')
    expect(classifyAction('test.custom_action')).toBe('HIGH')
  })
})
