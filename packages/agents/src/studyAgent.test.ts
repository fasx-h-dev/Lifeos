import { describe, it, expect, vi } from 'vitest'
import { AIProvider } from '@lifeos/ai'
import { InMemoryAuditSink } from '@lifeos/core'
import { rankStudyPlan, explainTopic } from './studyAgent'
import type { AgentDeps } from './types'

describe('rankStudyPlan (deterministic, no AI)', () => {
  const now = new Date('2026-01-01T00:00:00Z')

  it('surfaces an imminent high-priority assignment first', () => {
    const plan = rankStudyPlan({
      now,
      assignments: [
        { id: 'a1', title: 'Due soon', dueDate: new Date('2026-01-02T00:00:00Z'), priority: 1, status: 'todo' },
        { id: 'a2', title: 'Due later', dueDate: new Date('2026-01-20T00:00:00Z'), priority: 5, status: 'todo' }
      ],
      exams: [],
      topics: []
    })
    expect(plan[0].refId).toBe('a1')
  })

  it('skips completed assignments and assignments with no due date', () => {
    const plan = rankStudyPlan({
      now,
      assignments: [
        { id: 'a1', title: 'Done already', dueDate: new Date('2026-01-02T00:00:00Z'), priority: 1, status: 'done' },
        { id: 'a2', title: 'No due date', dueDate: null, priority: 1, status: 'todo' }
      ],
      exams: [],
      topics: []
    })
    expect(plan).toHaveLength(0)
  })

  it('includes exams within two weeks but not far-future ones', () => {
    const plan = rankStudyPlan({
      now,
      assignments: [],
      exams: [
        { id: 'e1', title: 'Soon exam', examDate: new Date('2026-01-05T00:00:00Z'), weight: 30 },
        { id: 'e2', title: 'Far exam', examDate: new Date('2026-04-01T00:00:00Z'), weight: 30 }
      ],
      topics: []
    })
    expect(plan.map((p) => p.refId)).toEqual(['e1'])
  })

  it('includes weak topics but ranks a near-term deadline above them', () => {
    const plan = rankStudyPlan({
      now,
      assignments: [{ id: 'a1', title: 'Due tomorrow', dueDate: new Date('2026-01-02T00:00:00Z'), priority: 1, status: 'todo' }],
      exams: [],
      topics: [
        { id: 't1', name: 'Weak topic', masteryLevel: 20 },
        { id: 't2', name: 'Mastered topic', masteryLevel: 90 }
      ]
    })
    expect(plan[0].refId).toBe('a1')
    expect(plan.some((p) => p.refId === 't1')).toBe(true)
    expect(plan.some((p) => p.refId === 't2')).toBe(false)
  })

  it('is a pure function — identical input produces identical output', () => {
    const input = {
      now,
      assignments: [{ id: 'a1', title: 'X', dueDate: new Date('2026-01-03T00:00:00Z'), priority: 2, status: 'todo' }],
      exams: [],
      topics: []
    }
    expect(rankStudyPlan(input)).toEqual(rankStudyPlan(input))
  })
})

describe('explainTopic (AI, on-demand, LOW risk)', () => {
  function deps(client?: { chat: { completions: { create: any } } }): AgentDeps {
    return {
      db: undefined,
      userId: 'u1',
      ai: new AIProvider(client ? { client } : { apiKey: undefined }),
      auditSink: new InMemoryAuditSink()
    }
  }

  it('BLOCKED when no AI provider is configured — never fabricates an explanation', async () => {
    const result = await explainTopic(deps(), { question: 'Explain Newton’s second law', topicContext: 'Physics: forces' })
    expect(result.status).toBe('BLOCKED')
    if (result.status === 'BLOCKED') expect(result.reason).toBe('AI_PROVIDER_NOT_CONFIGURED')
  })

  it('COMPLETED when the model answers using the given context', async () => {
    const client = { chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'F = ma...' } }] }) } } }
    const result = await explainTopic(deps(client), { question: 'Explain F=ma', topicContext: 'Physics: forces' })
    expect(result.status).toBe('COMPLETED')
    if (result.status === 'COMPLETED') expect(result.data).toContain('F = ma')
  })
})
