import type { AuditEntry } from './types'

export interface AuditSink {
  write(entry: AuditEntry): Promise<void> | void
}

/** In-memory sink for tests and for any caller that doesn't have a DB-backed sink yet. */
export class InMemoryAuditSink implements AuditSink {
  entries: AuditEntry[] = []
  write(entry: AuditEntry): void {
    this.entries.push(entry)
  }
}

/**
 * Every agent action gets logged here — time, agent, task, context state, action,
 * status, result, error, and the approval it's linked to (if any). This is the
 * Control Room's data source, so nothing an agent does is allowed to skip it.
 */
export class AuditLogger {
  constructor(private readonly sink: AuditSink) {}

  async log(entry: Omit<AuditEntry, 'timestamp'> & { timestamp?: string }): Promise<AuditEntry> {
    const full: AuditEntry = {
      timestamp: entry.timestamp ?? new Date().toISOString(),
      ...entry
    }
    await this.sink.write(full)
    return full
  }
}
