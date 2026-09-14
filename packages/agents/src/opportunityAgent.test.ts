import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest'
import { createTestDb, upsertUser, opportunitiesRepo } from '@lifeos/db'
import { AIProvider } from '@lifeos/ai'
import { InMemoryAuditSink } from '@lifeos/core'
import { canTransition, allowedNextStatuses, transitionOpportunity, findOpportunities } from './opportunityAgent'
import type { AgentDeps } from './types'

describe('opportunity status pipeline (deterministic)', () => {
  it('allows the documented forward path', () => {
    expect(canTransition('DISCOVERED', 'ELIGIBILITY_CHECK')).toBe(true)
    expect(canTransition('ELIGIBILITY_CHECK', 'RECOMMENDED')).toBe(true)
    expect(canTransition('RECOMMENDED', 'APPLYING')).toBe(true)
    expect(canTransition('APPLYING', 'AWAITING_REVIEW')).toBe(true)
    expect(canTransition('AWAITING_REVIEW', 'SUBMITTED')).toBe(true)
    expect(canTransition('SUBMITTED', 'ACCEPTED')).toBe(true)
  })

  it('rejects illegal jumps and any move out of a terminal state', () => {
    expect(canTransition('DISCOVERED', 'SUBMITTED')).toBe(false)
    expect(allowedNextStatuses('ACCEPTED')).toEqual([])
    expect(allowedNextStatuses('REJECTED')).toEqual([])
  })

  it('allows EXPIRED from any non-terminal state', () => {
    expect(canTransition('DISCOVERED', 'EXPIRED')).toBe(true)
    expect(canTransition('APPLYING', 'EXPIRED')).toBe(true)
  })
})

describe('transitionOpportunity (DB-backed)', () => {
  const userId = '44444444-4444-4444-4444-444444444444'
  let db: Awaited<ReturnType<typeof createTestDb>>

  beforeAll(async () => {
    db = await createTestDb()
    await upsertUser(db, { id: userId, email: 'founder@example.com' })
  })

  function deps(): AgentDeps {
    return { db, userId, ai: new AIProvider({ apiKey: undefined }), auditSink: new InMemoryAuditSink() }
  }

  it('shows up in the list right after creation, with the correct starting status', async () => {
    const opp = await opportunitiesRepo.create(db, userId, { title: 'Summer research program' })
    expect(opp.status).toBe('DISCOVERED')
    const list = await opportunitiesRepo.list(db, userId)
    expect(list.some((o) => o.id === opp.id)).toBe(true)
  })

  it('a valid transition persists the new status', async () => {
    const opp = await opportunitiesRepo.create(db, userId, { title: 'Coding scholarship' })
    const result = await transitionOpportunity(deps(), { id: opp.id, from: 'DISCOVERED', to: 'ELIGIBILITY_CHECK' })
    expect(result.status).toBe('COMPLETED')
    const [reread] = await opportunitiesRepo.list(db, userId).then((l) => l.filter((o) => o.id === opp.id))
    expect(reread.status).toBe('ELIGIBILITY_CHECK')
  })

  it('an illegal transition fails and leaves the stored status untouched', async () => {
    const opp = await opportunitiesRepo.create(db, userId, { title: 'Robotics grant' })
    const result = await transitionOpportunity(deps(), { id: opp.id, from: 'DISCOVERED', to: 'SUBMITTED' })
    expect(result.status).toBe('FAILED')
    const [reread] = await opportunitiesRepo.list(db, userId).then((l) => l.filter((o) => o.id === opp.id))
    expect(reread.status).toBe('DISCOVERED')
  })
})

describe('findOpportunities — never fabricates search results', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('WEB_RESEARCH_NOT_CONFIGURED when no search API key is set, no network call made', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const result = await findOpportunities({ searchApiKey: undefined, auditSink: new InMemoryAuditSink(), userId: 'u1' }, 'robotics scholarships')
    expect(result.status).toBe('BLOCKED')
    if (result.status === 'BLOCKED') expect(result.reason).toBe('WEB_RESEARCH_NOT_CONFIGURED')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('a search API failure is reported as FAILED, not a fabricated empty/success result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    )
    const result = await findOpportunities({ searchApiKey: 'fake-key', auditSink: new InMemoryAuditSink(), userId: 'u1' }, 'robotics scholarships')
    expect(result.status).toBe('FAILED')
  })
})
