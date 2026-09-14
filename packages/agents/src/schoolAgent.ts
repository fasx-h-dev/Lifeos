import { AuditLogger, evaluateContextGate, classifyAction } from '@lifeos/core'
import { assignmentsRepo } from '@lifeos/db'
import type { AgentDeps, AgentOutcome } from './types'

export type ExtractedAssignmentFields = {
  title: string | null
  instructions: string | null
  dueDate: string | null // ISO 8601, or null if not present in the text
  ambiguousDueDate: boolean
  ambiguityReason: string | null
  confidence: number // 0-1, the model's own confidence in this extraction
}

const EXTRACT_SCHEMA_DESCRIPTION =
  '{title: string|null, instructions: string|null, dueDate: string(ISO 8601)|null, ' +
  'ambiguousDueDate: boolean, ambiguityReason: string|null, confidence: number between 0 and 1}. ' +
  'Set ambiguousDueDate=true only if the text contains two or more conflicting dates/times for the same deadline.'

export type AssignmentRow = typeof import('@lifeos/db').schema.assignments.$inferSelect

/**
 * The School Agent's core pipeline: raw pasted text -> AI extract -> Context Gate -> store.
 * Nothing is written to the database unless the gate says READY. A NEEDS_INFO or UNCERTAIN
 * result is returned to the caller with exactly what's missing/ambiguous — never a guess.
 */
export async function extractAndCreateAssignment(
  deps: AgentDeps,
  input: { rawText: string; subjectId?: string; teacherId?: string }
): Promise<AgentOutcome<AssignmentRow>> {
  const action = 'ai.draft.assignment_extract'
  classifyAction(action) // throws if this action was never registered — fail loud, not silent
  const audit = new AuditLogger(deps.auditSink)

  if (!deps.ai.isConfigured) {
    await audit.log({
      agent: 'SchoolAgent',
      task: 'extract-assignment',
      contextState: 'BLOCKED',
      action,
      status: 'BLOCKED',
      error: 'AI_PROVIDER_NOT_CONFIGURED'
    })
    return { status: 'BLOCKED', reason: 'AI_PROVIDER_NOT_CONFIGURED', instructions: 'Set OPENAI_API_KEY in the API environment.' }
  }

  const extraction = await deps.ai.extract<ExtractedAssignmentFields>({
    text: input.rawText,
    schemaDescription: EXTRACT_SCHEMA_DESCRIPTION
  })

  if (extraction.status === 'AI_PROVIDER_NOT_CONFIGURED') {
    return { status: 'BLOCKED', reason: extraction.reason }
  }
  if (extraction.status === 'FAILED') {
    await audit.log({
      agent: 'SchoolAgent',
      task: 'extract-assignment',
      contextState: 'FAILED',
      action,
      status: 'FAILED',
      error: extraction.error
    })
    return { status: 'FAILED', error: extraction.error }
  }

  const fields = extraction.data
  const gate = evaluateContextGate({
    requiredFields: { title: fields.title, dueDate: fields.dueDate, instructions: fields.instructions },
    ambiguousFields: fields.ambiguousDueDate
      ? [{ field: 'dueDate', reason: fields.ambiguityReason ?? 'conflicting date signals in source text' }]
      : [],
    confidence: fields.confidence
  })

  if (gate.status === 'NEEDS_INFO') {
    await audit.log({
      agent: 'SchoolAgent',
      task: 'extract-assignment',
      contextState: 'NEEDS_INFO',
      action,
      status: 'NEEDS_INFO',
      result: { missing: gate.missing }
    })
    return { status: 'NEEDS_INFO', missing: gate.missing }
  }

  if (gate.status === 'UNCERTAIN') {
    await audit.log({
      agent: 'SchoolAgent',
      task: 'extract-assignment',
      contextState: 'UNCERTAIN',
      action,
      status: 'UNCERTAIN',
      result: { reason: gate.reason, fields: gate.fields }
    })
    return { status: 'UNCERTAIN', reason: gate.reason, fields: gate.fields }
  }

  // gate.status === 'READY' — safe to persist
  const created = await assignmentsRepo.create(deps.db, deps.userId, {
    title: fields.title as string,
    instructions: fields.instructions ?? undefined,
    dueDate: fields.dueDate ? new Date(fields.dueDate) : undefined,
    subjectId: input.subjectId,
    teacherId: input.teacherId,
    contextState: 'READY',
    sourceRawText: input.rawText
  })

  await audit.log({
    agent: 'SchoolAgent',
    task: 'extract-assignment',
    contextState: 'READY',
    action,
    status: 'COMPLETED',
    result: { assignmentId: created.id }
  })

  return { status: 'COMPLETED', data: created }
}

/**
 * Direct manual creation (the student fills a form) still passes through the Context Gate —
 * required fields missing means nothing is written, same as the AI pipeline.
 */
export async function createAssignmentDirect(
  deps: AgentDeps,
  input: { title?: string; instructions?: string; dueDate?: Date; subjectId?: string; teacherId?: string; priority?: number }
): Promise<AgentOutcome<AssignmentRow>> {
  const audit = new AuditLogger(deps.auditSink)
  const gate = evaluateContextGate({
    requiredFields: { title: input.title }
  })

  if (gate.status !== 'READY') {
    await audit.log({
      agent: 'SchoolAgent',
      task: 'create-assignment-direct',
      contextState: gate.status,
      action: 'assignment.create',
      status: gate.status,
      result: gate.status === 'NEEDS_INFO' ? { missing: gate.missing } : undefined
    })
    return gate.status === 'NEEDS_INFO'
      ? { status: 'NEEDS_INFO', missing: gate.missing }
      : { status: 'UNCERTAIN', reason: (gate as { reason: string }).reason, fields: [] }
  }

  const created = await assignmentsRepo.create(deps.db, deps.userId, {
    title: input.title as string,
    instructions: input.instructions,
    dueDate: input.dueDate,
    subjectId: input.subjectId,
    teacherId: input.teacherId,
    priority: input.priority,
    contextState: 'READY'
  })

  await audit.log({
    agent: 'SchoolAgent',
    task: 'create-assignment-direct',
    contextState: 'READY',
    action: 'assignment.create',
    status: 'COMPLETED',
    result: { assignmentId: created.id }
  })

  return { status: 'COMPLETED', data: created }
}
