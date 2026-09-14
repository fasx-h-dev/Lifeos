import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createTestDb, upsertUser, leadsRepo, outreachRepo, activityLogRepo, createDbAuditSink } from '@lifeos/db'
import { AIProvider } from '@lifeos/ai'
import { createLead, draftOutreach, decideOutreach, sendOutreach } from './businessAgent'
import type { AgentDeps } from './types'

describe('BusinessAgent — CRM and gated outreach', () => {
  const userId = '55555555-5555-5555-5555-555555555555'
  let db: Awaited<ReturnType<typeof createTestDb>>

  beforeAll(async () => {
    db = await createTestDb()
    await upsertUser(db, { id: userId, email: 'founder@example.com' })
  })

  // use the real DB-backed audit sink (not InMemoryAuditSink) so tests can assert
  // against the activity_log table, matching how the agent runs in production
  function deps(client?: { chat: { completions: { create: any } } }): AgentDeps {
    return { db, userId, ai: new AIProvider(client ? { client } : { apiKey: undefined }), auditSink: createDbAuditSink(db, userId) }
  }

  it('a created lead shows up in the CRM list', async () => {
    const lead = await createLead(deps(), { name: 'Jane Prospect', company: 'Acme' })
    const list = await leadsRepo.list(db, userId)
    expect(list.some((l) => l.id === lead.id)).toBe(true)
  })

  it('draftOutreach is BLOCKED (not a guessed draft) when AI is not configured, nothing persisted', async () => {
    const lead = await createLead(deps(), { name: 'No AI Prospect' })
    const before = await outreachRepo.list(db, userId)
    const result = await draftOutreach(deps(), { leadId: lead.id, leadName: lead.name, goal: 'intro call', businessContext: 'ctx' })
    expect(result.status).toBe('BLOCKED')
    const after = await outreachRepo.list(db, userId)
    expect(after.length).toBe(before.length)
  })

  it('draftOutreach with AI configured always lands AWAITING_REVIEW as HIGH risk, never auto-sent', async () => {
    const lead = await createLead(deps(), { name: 'Real Prospect', company: 'Acme Inc' })
    const client = {
      chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Hi Real Prospect, ...' } }] }) } }
    }
    const result = await draftOutreach(deps(client), {
      leadId: lead.id,
      leadName: lead.name,
      company: 'Acme Inc',
      goal: 'schedule a call',
      businessContext: 'We sell tutoring software'
    })
    expect(result.status).toBe('AWAITING_REVIEW')
    if (result.status !== 'AWAITING_REVIEW') throw new Error('expected AWAITING_REVIEW')

    const [row] = await outreachRepo.list(db, userId)
    expect(row.status).toBe('AWAITING_REVIEW')
  })

  it('rejecting an outreach draft moves it to REJECTED and writes an audit log entry', async () => {
    const lead = await createLead(deps(), { name: 'Reject Me Prospect' })
    const client = {
      chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Draft body' } }] }) } }
    }
    const drafted = await draftOutreach(deps(client), { leadId: lead.id, leadName: lead.name, goal: 'x', businessContext: 'ctx' })
    if (drafted.status !== 'AWAITING_REVIEW') throw new Error('expected AWAITING_REVIEW')

    const decision = await decideOutreach(deps(), {
      outreachId: drafted.data.id,
      approvalId: drafted.approvalId,
      decision: 'REJECTED',
      decidedBy: userId
    })
    expect(decision.status).toBe('COMPLETED')

    const logs = await activityLogRepo.list(db, userId)
    expect(logs.some((l) => l.task === 'decide-outreach' && l.linkedApprovalId === drafted.approvalId)).toBe(true)
  })

  it('an already-decided approval cannot be decided again', async () => {
    const lead = await createLead(deps(), { name: 'Double Decide Prospect' })
    const client = {
      chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Draft body' } }] }) } }
    }
    const drafted = await draftOutreach(deps(client), { leadId: lead.id, leadName: lead.name, goal: 'x', businessContext: 'ctx' })
    if (drafted.status !== 'AWAITING_REVIEW') throw new Error('expected AWAITING_REVIEW')

    await decideOutreach(deps(), { outreachId: drafted.data.id, approvalId: drafted.approvalId, decision: 'APPROVED', decidedBy: userId })
    const second = await decideOutreach(deps(), { outreachId: drafted.data.id, approvalId: drafted.approvalId, decision: 'APPROVED', decidedBy: userId })
    expect(second.status).toBe('FAILED')
  })

  it('sendOutreach always reports EMAIL_PROVIDER_NOT_CONFIGURED — no send capability exists yet', async () => {
    const result = await sendOutreach(deps(), { outreachId: 'irrelevant' })
    expect(result).toEqual({
      status: 'BLOCKED',
      reason: 'EMAIL_PROVIDER_NOT_CONFIGURED',
      instructions: 'Connect Gmail API or SendGrid and set the corresponding env vars before outreach can actually send.'
    })
  })
})
