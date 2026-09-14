import { describe, it, expect } from 'vitest'
import { evaluateContextGate } from './contextGate'

describe('evaluateContextGate', () => {
  it('returns READY when all required fields are present and confidence is high', () => {
    const result = evaluateContextGate({
      requiredFields: { subject: 'Physics', dueDate: '2026-01-01' },
      confidence: 0.9
    })
    expect(result.status).toBe('READY')
  })

  it('returns NEEDS_INFO listing every missing/empty required field', () => {
    const result = evaluateContextGate({
      requiredFields: { subject: 'Physics', dueDate: '', instructions: undefined, priority: 3 }
    })
    expect(result).toEqual({ status: 'NEEDS_INFO', missing: ['dueDate', 'instructions'] })
  })

  it('returns UNCERTAIN when fields conflict, and never falls through to READY', () => {
    const result = evaluateContextGate({
      requiredFields: { subject: 'Physics', dueDate: '2026-01-01' },
      ambiguousFields: [{ field: 'dueDate', reason: 'two different dates found in source text' }]
    })
    expect(result.status).toBe('UNCERTAIN')
    if (result.status === 'UNCERTAIN') {
      expect(result.fields).toContain('dueDate')
    }
  })

  it('returns UNCERTAIN when extraction confidence is below threshold', () => {
    const result = evaluateContextGate({
      requiredFields: { subject: 'Physics' },
      confidence: 0.2
    })
    expect(result.status).toBe('UNCERTAIN')
  })

  it('returns BLOCKED when a hard blocker is set, even if fields are complete', () => {
    const result = evaluateContextGate({
      requiredFields: { subject: 'Physics' },
      blockedReason: 'AI_PROVIDER_NOT_CONFIGURED'
    })
    expect(result).toEqual({ status: 'BLOCKED', reason: 'AI_PROVIDER_NOT_CONFIGURED' })
  })

  it('never returns READY when required fields are missing, regardless of confidence', () => {
    const result = evaluateContextGate({
      requiredFields: { subject: '' },
      confidence: 1
    })
    expect(result.status).not.toBe('READY')
  })
})
