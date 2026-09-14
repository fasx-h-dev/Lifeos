import { describe, it, expect, beforeAll } from 'vitest'
import { createTestDb } from './testDb'
import {
  upsertUser,
  ensureProfile,
  subjectsRepo,
  assignmentsRepo,
  approvalsRepo,
  activityLogRepo,
  createDbAuditSink,
  opportunitiesRepo,
  leadsRepo,
  outreachRepo,
  calendarRepo
} from './repositories'
import { AuditLogger } from '@lifeos/core'

// These tests run migrations against an embedded pglite Postgres (no external DB
// required) and exercise the repository layer end to end, proving the schema is
// actually valid SQL and the repos actually work — not just that they typecheck.

describe('db repositories (pglite)', async () => {
  const db = await createTestDb()
  const userId = '11111111-1111-1111-1111-111111111111'

  beforeAll(async () => {
    await upsertUser(db, { id: userId, email: 'student@example.com' })
  })

  it('ensureProfile creates exactly one profile per user', async () => {
    const p1 = await ensureProfile(db, userId, { fullName: 'Student' })
    const p2 = await ensureProfile(db, userId, { fullName: 'Should Not Overwrite' })
    expect(p1.id).toBe(p2.id)
    expect(p2.fullName).toBe('Student')
  })

  it('creates a subject and an assignment against it', async () => {
    const subject = await subjectsRepo.create(db, userId, { name: 'Physics' })
    const assignment = await assignmentsRepo.create(db, userId, {
      title: 'Lab report',
      subjectId: subject.id,
      dueDate: new Date('2026-01-10T00:00:00Z'),
      priority: 1
    })
    expect(assignment.status).toBe('todo')
    expect(assignment.contextState).toBe('READY')

    const list = await assignmentsRepo.list(db, userId)
    expect(list.some((a) => a.id === assignment.id)).toBe(true)
  })

  it('approval flow: create AWAITING_REVIEW, decide, cannot re-decide', async () => {
    const approval = await approvalsRepo.create(db, userId, {
      taskRef: 'outreach:1',
      action: 'external.send_message',
      riskLevel: 'HIGH',
      summary: 'Send outreach to Acme'
    })
    expect(approval.status).toBe('AWAITING_REVIEW')

    const decided = await approvalsRepo.decide(db, approval.id, userId, 'APPROVED', userId)
    expect(decided.status).toBe('APPROVED')

    // Re-deciding an already-decided approval must not silently succeed —
    // the WHERE clause requires status = AWAITING_REVIEW, so this returns undefined.
    const redecided = await approvalsRepo.decide(db, approval.id, userId, 'REJECTED', userId)
    expect(redecided).toBeUndefined()
  })

  it('AuditLogger writes through to the activity_log table via the DB sink', async () => {
    const sink = createDbAuditSink(db, userId)
    const logger = new AuditLogger(sink)
    await logger.log({
      agent: 'SchoolAgent',
      task: 'extract-assignment',
      contextState: 'READY',
      action: 'assignment.create',
      status: 'COMPLETED'
    })
    const entries = await activityLogRepo.list(db, userId)
    expect(entries.some((e) => e.task === 'extract-assignment')).toBe(true)
  })

  it('opportunity pipeline transitions through real status values', async () => {
    const opp = await opportunitiesRepo.create(db, userId, { title: 'Summer research program' })
    expect(opp.status).toBe('DISCOVERED')
    const updated = await opportunitiesRepo.updateStatus(db, opp.id, userId, 'RECOMMENDED')
    expect(updated.status).toBe('RECOMMENDED')
  })

  it('lead created shows up in the CRM list', async () => {
    const lead = await leadsRepo.create(db, userId, { name: 'Jane Prospect', company: 'Acme' })
    const list = await leadsRepo.list(db, userId)
    expect(list.some((l) => l.id === lead.id)).toBe(true)
  })

  it('outreach draft is created AWAITING_REVIEW, never auto-sent', async () => {
    const lead = await leadsRepo.create(db, userId, { name: 'Another Prospect' })
    const draft = await outreachRepo.create(db, userId, { leadId: lead.id, draftBody: 'Hi there...' })
    expect(draft.status).toBe('AWAITING_REVIEW')
  })

  it('calendar upsertFromSource is idempotent for the same source id', async () => {
    const first = await calendarRepo.upsertFromSource(db, userId, {
      sourceType: 'assignment',
      sourceId: '22222222-2222-2222-2222-222222222222',
      title: 'Lab report due',
      startAt: new Date('2026-01-10T00:00:00Z')
    })
    const second = await calendarRepo.upsertFromSource(db, userId, {
      sourceType: 'assignment',
      sourceId: '22222222-2222-2222-2222-222222222222',
      title: 'Lab report due (renamed)',
      startAt: new Date('2026-01-10T00:00:00Z')
    })
    expect(second.id).toBe(first.id)
    expect(second.title).toBe('Lab report due (renamed)')

    const range = await calendarRepo.listRange(db, userId, new Date('2026-01-01'), new Date('2026-01-31'))
    expect(range.filter((e) => e.id === first.id)).toHaveLength(1)
  })
})
