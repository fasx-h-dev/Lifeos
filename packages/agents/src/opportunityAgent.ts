import { AuditLogger } from '@lifeos/core'
import { opportunitiesRepo } from '@lifeos/db'
import type { AgentDeps, AgentOutcome } from './types'

export type OpportunityStatus =
  | 'DISCOVERED'
  | 'ELIGIBILITY_CHECK'
  | 'RECOMMENDED'
  | 'APPLYING'
  | 'AWAITING_REVIEW'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'

const TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  DISCOVERED: ['ELIGIBILITY_CHECK', 'EXPIRED'],
  ELIGIBILITY_CHECK: ['RECOMMENDED', 'REJECTED', 'EXPIRED'],
  RECOMMENDED: ['APPLYING', 'EXPIRED'],
  APPLYING: ['AWAITING_REVIEW', 'EXPIRED'],
  AWAITING_REVIEW: ['SUBMITTED', 'EXPIRED'],
  SUBMITTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: []
}

export function allowedNextStatuses(current: OpportunityStatus): OpportunityStatus[] {
  return TRANSITIONS[current]
}

export function canTransition(from: OpportunityStatus, to: OpportunityStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Deterministic, LOW-risk (auto-executes) — moving a card through a known pipeline needs no approval. */
export async function transitionOpportunity(
  deps: AgentDeps,
  input: { id: string; from: OpportunityStatus; to: OpportunityStatus }
): Promise<AgentOutcome<{ id: string; status: OpportunityStatus }>> {
  const audit = new AuditLogger(deps.auditSink)

  if (!canTransition(input.from, input.to)) {
    await audit.log({
      agent: 'OpportunityAgent',
      task: 'transition-status',
      contextState: 'BLOCKED',
      action: 'opportunity.status_transition',
      status: 'FAILED',
      error: `Illegal transition ${input.from} -> ${input.to}`
    })
    return { status: 'FAILED', error: `Cannot move an opportunity from ${input.from} to ${input.to}` }
  }

  const updated = await opportunitiesRepo.updateStatus(deps.db, input.id, deps.userId, input.to)

  await audit.log({
    agent: 'OpportunityAgent',
    task: 'transition-status',
    contextState: 'READY',
    action: 'opportunity.status_transition',
    status: 'COMPLETED',
    result: { id: input.id, from: input.from, to: input.to }
  })

  return { status: 'COMPLETED', data: { id: updated.id, status: updated.status as OpportunityStatus } }
}

/**
 * "Find opportunities" delegates to a real web-search API (SERPAPI_KEY). Without a key,
 * this returns a typed WEB_RESEARCH_NOT_CONFIGURED block with setup instructions —
 * it never fabricates search results.
 */
export async function findOpportunities(
  deps: { searchApiKey?: string; auditSink: AgentDeps['auditSink']; userId: string },
  query: string
): Promise<AgentOutcome<{ title: string; url: string; snippet: string }[]>> {
  const audit = new AuditLogger(deps.auditSink)
  const key = deps.searchApiKey ?? process.env.SERPAPI_KEY

  if (!key) {
    await audit.log({
      agent: 'OpportunityAgent',
      task: 'find-opportunities',
      contextState: 'BLOCKED',
      action: 'opportunity.web_research',
      status: 'BLOCKED',
      error: 'WEB_RESEARCH_NOT_CONFIGURED'
    })
    return {
      status: 'BLOCKED',
      reason: 'WEB_RESEARCH_NOT_CONFIGURED',
      instructions: 'Set SERPAPI_KEY in the API environment (create a key at serpapi.com) to enable "Find opportunities".'
    }
  }

  try {
    const res = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${key}`)
    if (!res.ok) {
      const error = `Search API returned ${res.status}`
      await audit.log({
        agent: 'OpportunityAgent',
        task: 'find-opportunities',
        contextState: 'FAILED',
        action: 'opportunity.web_research',
        status: 'FAILED',
        error
      })
      return { status: 'FAILED', error }
    }
    const body = (await res.json()) as { organic_results?: { title: string; link: string; snippet: string }[] }
    const results = (body.organic_results ?? []).map((r) => ({ title: r.title, url: r.link, snippet: r.snippet }))
    await audit.log({
      agent: 'OpportunityAgent',
      task: 'find-opportunities',
      contextState: 'READY',
      action: 'opportunity.web_research',
      status: 'COMPLETED',
      result: { count: results.length }
    })
    return { status: 'COMPLETED', data: results }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await audit.log({
      agent: 'OpportunityAgent',
      task: 'find-opportunities',
      contextState: 'FAILED',
      action: 'opportunity.web_research',
      status: 'FAILED',
      error
    })
    return { status: 'FAILED', error }
  }
}
