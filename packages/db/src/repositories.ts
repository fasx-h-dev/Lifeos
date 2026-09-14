import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import type { Database } from './client'
import * as schema from './schema'
import type { AuditEntry, AuditSink } from '@lifeos/core'

type AnyDb = Database | Awaited<ReturnType<typeof import('./testDb.js').createTestDb>>

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------
export async function upsertUser(db: AnyDb, input: { id: string; email: string }) {
  const [row] = await db
    .insert(schema.users)
    .values(input)
    .onConflictDoUpdate({ target: schema.users.id, set: { email: input.email } })
    .returning()
  return row
}

export async function ensureProfile(db: AnyDb, userId: string, defaults: Partial<typeof schema.profiles.$inferInsert> = {}) {
  const existing = await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, userId) })
  if (existing) return existing
  const [row] = await db
    .insert(schema.profiles)
    .values({ userId, ...defaults })
    .returning()
  return row
}

// ---------------------------------------------------------------------------
// School domain
// ---------------------------------------------------------------------------
export const subjectsRepo = {
  list: (db: AnyDb, userId: string) =>
    db.select().from(schema.subjects).where(eq(schema.subjects.userId, userId)).orderBy(schema.subjects.name),
  create: async (db: AnyDb, userId: string, input: { name: string; color?: string }) =>
    (await db.insert(schema.subjects).values({ userId, ...input }).returning())[0]
}

export const teachersRepo = {
  list: (db: AnyDb, userId: string) =>
    db.select().from(schema.teachers).where(eq(schema.teachers.userId, userId)).orderBy(schema.teachers.name),
  create: async (
    db: AnyDb,
    userId: string,
    input: { name: string; subjectId?: string | null; role?: 'teacher' | 'tutor'; email?: string; phone?: string; notes?: string }
  ) => (await db.insert(schema.teachers).values({ userId, ...input }).returning())[0],
  update: async (db: AnyDb, id: string, userId: string, updates: Partial<typeof schema.teachers.$inferInsert>) =>
    (
      await db
        .update(schema.teachers)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.teachers.id, id), eq(schema.teachers.userId, userId)))
        .returning()
    )[0],
  remove: (db: AnyDb, id: string, userId: string) =>
    db.delete(schema.teachers).where(and(eq(schema.teachers.id, id), eq(schema.teachers.userId, userId)))
}

export const assignmentsRepo = {
  list: (db: AnyDb, userId: string) =>
    db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.userId, userId))
      .orderBy(schema.assignments.dueDate),
  create: async (db: AnyDb, userId: string, input: Partial<typeof schema.assignments.$inferInsert> & { title: string }) =>
    (await db.insert(schema.assignments).values({ userId, ...input }).returning())[0],
  update: async (db: AnyDb, id: string, userId: string, updates: Partial<typeof schema.assignments.$inferInsert>) =>
    (
      await db
        .update(schema.assignments)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.assignments.id, id), eq(schema.assignments.userId, userId)))
        .returning()
    )[0],
  remove: (db: AnyDb, id: string, userId: string) =>
    db.delete(schema.assignments).where(and(eq(schema.assignments.id, id), eq(schema.assignments.userId, userId)))
}

export const examsRepo = {
  list: (db: AnyDb, userId: string) =>
    db.select().from(schema.exams).where(eq(schema.exams.userId, userId)).orderBy(schema.exams.examDate),
  create: async (db: AnyDb, userId: string, input: Partial<typeof schema.exams.$inferInsert> & { title: string; examDate: Date }) =>
    (await db.insert(schema.exams).values({ userId, ...input }).returning())[0]
}

export const studySessionsRepo = {
  list: (db: AnyDb, userId: string) =>
    db
      .select()
      .from(schema.studySessions)
      .where(eq(schema.studySessions.userId, userId))
      .orderBy(schema.studySessions.scheduledFor),
  create: async (
    db: AnyDb,
    userId: string,
    input: Partial<typeof schema.studySessions.$inferInsert> & { scheduledFor: Date }
  ) => (await db.insert(schema.studySessions).values({ userId, ...input }).returning())[0]
}

export const mistakesRepo = {
  list: (db: AnyDb, userId: string) =>
    db.select().from(schema.mistakes).where(eq(schema.mistakes.userId, userId)).orderBy(desc(schema.mistakes.occurredAt))
}

// ---------------------------------------------------------------------------
// Opportunity domain
// ---------------------------------------------------------------------------
export const opportunitiesRepo = {
  list: (db: AnyDb, userId: string) =>
    db
      .select()
      .from(schema.opportunities)
      .where(eq(schema.opportunities.userId, userId))
      .orderBy(schema.opportunities.deadline),
  create: async (db: AnyDb, userId: string, input: Partial<typeof schema.opportunities.$inferInsert> & { title: string }) =>
    (await db.insert(schema.opportunities).values({ userId, ...input }).returning())[0],
  updateStatus: async (db: AnyDb, id: string, userId: string, status: (typeof schema.opportunities.$inferSelect)['status']) =>
    (
      await db
        .update(schema.opportunities)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(schema.opportunities.id, id), eq(schema.opportunities.userId, userId)))
        .returning()
    )[0]
}

// ---------------------------------------------------------------------------
// Business CRM domain
// ---------------------------------------------------------------------------
export const leadsRepo = {
  list: (db: AnyDb, userId: string) =>
    db.select().from(schema.businessLeads).where(eq(schema.businessLeads.userId, userId)).orderBy(desc(schema.businessLeads.createdAt)),
  create: async (db: AnyDb, userId: string, input: Partial<typeof schema.businessLeads.$inferInsert> & { name: string }) =>
    (await db.insert(schema.businessLeads).values({ userId, ...input }).returning())[0]
}

export const outreachRepo = {
  list: (db: AnyDb, userId: string) =>
    db.select().from(schema.outreach).where(eq(schema.outreach.userId, userId)).orderBy(desc(schema.outreach.createdAt)),
  create: async (db: AnyDb, userId: string, input: Partial<typeof schema.outreach.$inferInsert> & { leadId: string; draftBody: string }) =>
    (await db.insert(schema.outreach).values({ userId, status: 'AWAITING_REVIEW', ...input }).returning())[0],
  markDecision: async (db: AnyDb, id: string, userId: string, status: 'APPROVED' | 'REJECTED', approvalId: string) =>
    (
      await db
        .update(schema.outreach)
        .set({ status, approvalId, updatedAt: new Date() })
        .where(and(eq(schema.outreach.id, id), eq(schema.outreach.userId, userId)))
        .returning()
    )[0]
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------
export const calendarRepo = {
  listRange: (db: AnyDb, userId: string, from: Date, to: Date) =>
    db
      .select()
      .from(schema.calendarEvents)
      .where(and(eq(schema.calendarEvents.userId, userId), gte(schema.calendarEvents.startAt, from), lte(schema.calendarEvents.startAt, to)))
      .orderBy(schema.calendarEvents.startAt),
  upsertFromSource: async (
    db: AnyDb,
    userId: string,
    input: { sourceType: string; sourceId: string; title: string; startAt: Date; endAt?: Date | null; allDay?: boolean }
  ) => {
    const existing = await db.query.calendarEvents.findFirst({
      where: and(
        eq(schema.calendarEvents.userId, userId),
        eq(schema.calendarEvents.sourceType, input.sourceType),
        eq(schema.calendarEvents.sourceId, input.sourceId)
      )
    })
    if (existing) {
      return (
        await db
          .update(schema.calendarEvents)
          .set({ title: input.title, startAt: input.startAt, endAt: input.endAt, updatedAt: new Date() })
          .where(eq(schema.calendarEvents.id, existing.id))
          .returning()
      )[0]
    }
    return (await db.insert(schema.calendarEvents).values({ userId, ...input }).returning())[0]
  }
}

// ---------------------------------------------------------------------------
// Governance: Approvals, Audit Log, AI Tasks, Notifications, Integrations
// ---------------------------------------------------------------------------
export const approvalsRepo = {
  list: (db: AnyDb, userId: string, status?: 'AWAITING_REVIEW' | 'APPROVED' | 'REJECTED') =>
    db
      .select()
      .from(schema.approvals)
      .where(status ? and(eq(schema.approvals.userId, userId), eq(schema.approvals.status, status)) : eq(schema.approvals.userId, userId))
      .orderBy(desc(schema.approvals.createdAt)),
  create: async (
    db: AnyDb,
    userId: string,
    input: { taskRef: string; action: string; riskLevel: 'MEDIUM' | 'HIGH'; summary: string; payload?: unknown }
  ) => (await db.insert(schema.approvals).values({ userId, ...input }).returning())[0],
  decide: async (db: AnyDb, id: string, userId: string, status: 'APPROVED' | 'REJECTED', decidedBy: string) =>
    (
      await db
        .update(schema.approvals)
        .set({ status, decidedAt: new Date(), decidedBy })
        .where(and(eq(schema.approvals.id, id), eq(schema.approvals.userId, userId), eq(schema.approvals.status, 'AWAITING_REVIEW')))
        .returning()
    )[0]
}

export const activityLogRepo = {
  list: (db: AnyDb, userId: string, limit = 100) =>
    db.select().from(schema.activityLog).where(eq(schema.activityLog.userId, userId)).orderBy(desc(schema.activityLog.createdAt)).limit(limit)
}

/** Adapts the DB-backed activity_log table to packages/core's framework-free AuditSink interface. */
export function createDbAuditSink(db: AnyDb, userId: string): AuditSink {
  return {
    async write(entry: AuditEntry) {
      await db.insert(schema.activityLog).values({
        userId,
        agent: entry.agent,
        task: entry.task,
        contextState: entry.contextState,
        action: entry.action,
        status: entry.status,
        resultSummary: entry.result ?? null,
        error: entry.error ?? null,
        linkedApprovalId: entry.linkedApprovalId ?? null
      })
    }
  }
}

export const aiTasksRepo = {
  list: (db: AnyDb, userId: string, limit = 50) =>
    db.select().from(schema.aiTasks).where(eq(schema.aiTasks.userId, userId)).orderBy(desc(schema.aiTasks.createdAt)).limit(limit),
  create: async (db: AnyDb, userId: string, input: Partial<typeof schema.aiTasks.$inferInsert> & { kind: string; agent: string; model: string; contextState: string; status: string }) =>
    (await db.insert(schema.aiTasks).values({ userId, ...input } as typeof schema.aiTasks.$inferInsert).returning())[0],
  totalCostUsd: async (db: AnyDb, userId: string) => {
    const [row] = await db
      .select({ total: sql<string>`coalesce(sum(${schema.aiTasks.costEstUsd}), 0)` })
      .from(schema.aiTasks)
      .where(eq(schema.aiTasks.userId, userId))
    return Number(row?.total ?? 0)
  }
}

export const notificationsRepo = {
  list: (db: AnyDb, userId: string) =>
    db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt)),
  create: async (db: AnyDb, userId: string, input: { title: string; body?: string; url?: string; channel?: string; status?: string }) =>
    (await db.insert(schema.notifications).values({ userId, ...input } as typeof schema.notifications.$inferInsert).returning())[0]
}

export const pushSubscriptionsRepo = {
  list: (db: AnyDb, userId: string) => db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId)),
  upsert: async (db: AnyDb, userId: string, input: { endpoint: string; p256dh: string; auth: string }) =>
    (
      await db
        .insert(schema.pushSubscriptions)
        .values({ userId, ...input })
        .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { p256dh: input.p256dh, auth: input.auth } })
        .returning()
    )[0]
}

export const integrationsRepo = {
  list: (db: AnyDb, userId: string) => db.select().from(schema.integrations).where(eq(schema.integrations.userId, userId)),
  getStatus: async (db: AnyDb, userId: string, provider: 'google_calendar' | 'gmail' | 'lms') => {
    const row = await db.query.integrations.findFirst({
      where: and(eq(schema.integrations.userId, userId), eq(schema.integrations.provider, provider))
    })
    return row?.status ?? 'NOT_CONNECTED'
  }
}
