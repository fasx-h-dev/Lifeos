import type { AIProvider } from '@lifeos/ai'
import type { AuditSink, TaskStatus } from '@lifeos/core'

/** Loosest possible handle for either the real (node-postgres) or test (pglite) drizzle db. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AgentDb = any

export type AgentDeps = {
  db: AgentDb
  userId: string
  ai: AIProvider
  auditSink: AuditSink
}

/**
 * Uniform shape every agent action returns. Mirrors packages/core's TaskStatus so the
 * Control Room and Dashboard can render any agent's output the same way — no agent has
 * a private "it worked, trust me" shape that skips the typed states.
 */
export type AgentOutcome<T> =
  | { status: 'READY' | 'COMPLETED'; data: T }
  | { status: 'NEEDS_INFO'; missing: string[] }
  | { status: 'UNCERTAIN'; reason: string; fields: string[] }
  | { status: 'BLOCKED'; reason: string; instructions?: string }
  | { status: 'AWAITING_REVIEW'; data: T; approvalId: string }
  | { status: 'FAILED'; error: string }

export function outcomeStatus(o: AgentOutcome<unknown>): TaskStatus {
  return o.status
}
