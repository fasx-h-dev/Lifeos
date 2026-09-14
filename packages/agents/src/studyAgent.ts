import { AuditLogger } from '@lifeos/core'
import type { AgentDeps, AgentOutcome } from './types'

export type StudyPlanItem = {
  kind: 'assignment' | 'exam' | 'weak_topic'
  refId: string
  title: string
  reason: string
  urgencyScore: number // lower = more urgent, used for sort order
}

const WEAK_TOPIC_THRESHOLD = 50 // masteryLevel 0-100; below this counts as "weak"
const HOURS = 3600_000

/**
 * Deterministic "tonight's study plan" ranking — no AI involved. Pure function of
 * current assignments/exams/topic mastery, so it's cheap, instant, and identical
 * for the same input every time (unlike an LLM call).
 */
export function rankStudyPlan(input: {
  now: Date
  assignments: { id: string; title: string; dueDate: Date | null; priority: number; status: string }[]
  exams: { id: string; title: string; examDate: Date; weight: number | null }[]
  topics: { id: string; name: string; masteryLevel: number }[]
}): StudyPlanItem[] {
  const items: StudyPlanItem[] = []

  for (const a of input.assignments) {
    if (a.status === 'done' || !a.dueDate) continue
    const hoursUntilDue = (a.dueDate.getTime() - input.now.getTime()) / HOURS
    items.push({
      kind: 'assignment',
      refId: a.id,
      title: a.title,
      reason:
        hoursUntilDue <= 48
          ? `Due in ${Math.max(0, Math.round(hoursUntilDue))}h — priority ${a.priority}`
          : `Due ${a.dueDate.toLocaleDateString()} — priority ${a.priority}`,
      // priority is the dominant signal (1 = highest), due-date proximity breaks ties
      urgencyScore: a.priority * 1000 + hoursUntilDue
    })
  }

  for (const e of input.exams) {
    const hoursUntilExam = (e.examDate.getTime() - input.now.getTime()) / HOURS
    if (hoursUntilExam < 0 || hoursUntilExam > 14 * 24) continue // only surface exams within 2 weeks
    items.push({
      kind: 'exam',
      refId: e.id,
      title: e.title,
      reason: `Exam in ${Math.max(0, Math.round(hoursUntilExam / 24))} day(s)${e.weight ? `, weight ${e.weight}%` : ''}`,
      urgencyScore: hoursUntilExam - (e.weight ?? 0) * 2
    })
  }

  for (const t of input.topics) {
    if (t.masteryLevel >= WEAK_TOPIC_THRESHOLD) continue
    items.push({
      kind: 'weak_topic',
      refId: t.id,
      title: t.name,
      reason: `Mastery ${t.masteryLevel}/100 — needs review`,
      urgencyScore: 5000 + t.masteryLevel // weak topics matter, but never outrank a near-due deadline
    })
  }

  return items.sort((a, b) => a.urgencyScore - b.urgencyScore)
}

/**
 * On-demand explanation the student explicitly asks for. Classified LOW (auto-executes,
 * no approval queue) because nothing is written or sent — it's a synchronous answer to a
 * question the user asked right now, same risk class as any other read.
 */
export async function explainTopic(deps: AgentDeps, input: { question: string; topicContext: string }): Promise<AgentOutcome<string>> {
  const audit = new AuditLogger(deps.auditSink)

  if (!deps.ai.isConfigured) {
    await audit.log({
      agent: 'StudyAgent',
      task: 'explain-topic',
      contextState: 'BLOCKED',
      action: 'ai.explain.topic',
      status: 'BLOCKED',
      error: 'AI_PROVIDER_NOT_CONFIGURED'
    })
    return { status: 'BLOCKED', reason: 'AI_PROVIDER_NOT_CONFIGURED', instructions: 'Set OPENAI_API_KEY in the API environment.' }
  }

  const result = await deps.ai.analyze({ question: input.question, context: input.topicContext })

  if (result.status === 'AI_PROVIDER_NOT_CONFIGURED') {
    return { status: 'BLOCKED', reason: result.reason }
  }
  if (result.status === 'FAILED') {
    await audit.log({
      agent: 'StudyAgent',
      task: 'explain-topic',
      contextState: 'FAILED',
      action: 'ai.explain.topic',
      status: 'FAILED',
      error: result.error
    })
    return { status: 'FAILED', error: result.error }
  }

  await audit.log({
    agent: 'StudyAgent',
    task: 'explain-topic',
    contextState: 'READY',
    action: 'ai.explain.topic',
    status: 'COMPLETED',
    result: { usage: result.usage }
  })

  return { status: 'COMPLETED', data: result.data }
}
