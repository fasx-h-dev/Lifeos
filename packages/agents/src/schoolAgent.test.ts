import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createTestDb, upsertUser, assignmentsRepo } from '@lifeos/db'
import { AIProvider } from '@lifeos/ai'
import { InMemoryAuditSink } from '@lifeos/core'
import { extractAndCreateAssignment, createAssignmentDirect } from './schoolAgent'
import type { AgentDeps } from './types'

function fakeAiClient(content: string) {
  return { chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content } }] }) } } }
}

describe('SchoolAgent — extract-and-create pipeline', () => {
  const userId = '33333333-3333-3333-3333-333333333333'
  let db: Awaited<ReturnType<typeof createTestDb>>

  beforeAll(async () => {
    db = await createTestDb()
    await upsertUser(db, { id: userId, email: 'student@example.com' })
  })

  function deps(client: ReturnType<typeof fakeAiClient> | undefined): AgentDeps {
    return {
      db,
      userId,
      ai: new AIProvider(client ? { client } : { apiKey: undefined }),
      auditSink: new InMemoryAuditSink()
    }
  }

  it('READY: complete extraction persists the assignment, and it survives a fresh read', async () => {
    const client = fakeAiClient(
      JSON.stringify({
        title: 'Physics lab report',
        instructions: 'Write up the pendulum experiment',
        dueDate: '2026-02-01T00:00:00.000Z',
        ambiguousDueDate: false,
        ambiguityReason: null,
        confidence: 0.95
      })
    )
    const d = deps(client)
    const result = await extractAndCreateAssignment(d, { rawText: 'Physics lab report due Feb 1, write up the pendulum experiment.' })
    expect(result.status).toBe('COMPLETED')
    if (result.status !== 'COMPLETED' && result.status !== 'READY') throw new Error('unexpected status')

    // "survives refresh" — re-read from the DB with a fresh query, not the in-memory return value
    const reread = await assignmentsRepo.list(db, userId)
    expect(reread.some((a) => a.title === 'Physics lab report')).toBe(true)
  })

  it('NEEDS_INFO: missing instructions means nothing is persisted', async () => {
    const before = await assignmentsRepo.list(db, userId)
    const client = fakeAiClient(
      JSON.stringify({
        title: 'Chem worksheet',
        instructions: null,
        dueDate: '2026-02-05T00:00:00.000Z',
        ambiguousDueDate: false,
        ambiguityReason: null,
        confidence: 0.9
      })
    )
    const result = await extractAndCreateAssignment(deps(client), { rawText: 'Chem worksheet due Feb 5' })
    expect(result.status).toBe('NEEDS_INFO')
    if (result.status === 'NEEDS_INFO') expect(result.missing).toContain('instructions')

    const after = await assignmentsRepo.list(db, userId)
    expect(after.length).toBe(before.length)
    expect(after.some((a) => a.title === 'Chem worksheet')).toBe(false)
  })

  it('UNCERTAIN: conflicting due-date signals block persistence', async () => {
    const before = await assignmentsRepo.list(db, userId)
    const client = fakeAiClient(
      JSON.stringify({
        title: 'History essay',
        instructions: 'Compare two primary sources',
        dueDate: '2026-02-10T00:00:00.000Z',
        ambiguousDueDate: true,
        ambiguityReason: 'text says both "next Monday" and "Feb 3"',
        confidence: 0.4
      })
    )
    const result = await extractAndCreateAssignment(deps(client), {
      rawText: 'History essay due next Monday, or wait, Feb 3rd — check with teacher'
    })
    expect(result.status).toBe('UNCERTAIN')

    const after = await assignmentsRepo.list(db, userId)
    expect(after.length).toBe(before.length)
  })

  it('BLOCKED: no AI provider configured, no network call attempted', async () => {
    const result = await extractAndCreateAssignment(deps(undefined), { rawText: 'anything' })
    expect(result).toEqual({
      status: 'BLOCKED',
      reason: 'AI_PROVIDER_NOT_CONFIGURED',
      instructions: 'Set OPENAI_API_KEY in the API environment.'
    })
  })

  it('createAssignmentDirect: NEEDS_INFO when title is missing, nothing persisted', async () => {
    const before = await assignmentsRepo.list(db, userId)
    const result = await createAssignmentDirect(deps(undefined), { instructions: 'no title given' })
    expect(result.status).toBe('NEEDS_INFO')
    const after = await assignmentsRepo.list(db, userId)
    expect(after.length).toBe(before.length)
  })

  it('createAssignmentDirect: READY when title is present', async () => {
    const result = await createAssignmentDirect(deps(undefined), { title: 'Manual entry assignment' })
    expect(result.status).toBe('COMPLETED')
  })
})
