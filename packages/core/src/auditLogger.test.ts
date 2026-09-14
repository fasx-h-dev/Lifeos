import { describe, it, expect } from 'vitest'
import { AuditLogger, InMemoryAuditSink } from './auditLogger'

describe('AuditLogger', () => {
  it('writes a full entry with a timestamp attached', async () => {
    const sink = new InMemoryAuditSink()
    const logger = new AuditLogger(sink)
    const entry = await logger.log({
      agent: 'SchoolAgent',
      task: 'extract-assignment',
      contextState: 'READY',
      action: 'assignment.create',
      status: 'COMPLETED',
      result: { id: 'assign_1' }
    })
    expect(sink.entries).toHaveLength(1)
    expect(sink.entries[0]).toEqual(entry)
    expect(typeof entry.timestamp).toBe('string')
  })

  it('preserves an explicit error and links an approval id when present', async () => {
    const sink = new InMemoryAuditSink()
    const logger = new AuditLogger(sink)
    await logger.log({
      agent: 'BusinessAgent',
      task: 'send-outreach',
      contextState: 'READY',
      action: 'external.send_message',
      status: 'FAILED',
      error: 'AI_PROVIDER_NOT_CONFIGURED',
      linkedApprovalId: 'appr_9'
    })
    expect(sink.entries[0].error).toBe('AI_PROVIDER_NOT_CONFIGURED')
    expect(sink.entries[0].linkedApprovalId).toBe('appr_9')
  })

  it('logs entries in call order', async () => {
    const sink = new InMemoryAuditSink()
    const logger = new AuditLogger(sink)
    await logger.log({ agent: 'A', task: '1', contextState: 'READY', action: 'x', status: 'COMPLETED' })
    await logger.log({ agent: 'A', task: '2', contextState: 'READY', action: 'x', status: 'COMPLETED' })
    expect(sink.entries.map((e) => e.task)).toEqual(['1', '2'])
  })
})
