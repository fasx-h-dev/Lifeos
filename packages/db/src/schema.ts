import { sql } from 'drizzle-orm'
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  numeric
} from 'drizzle-orm/pg-core'

const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}

// ---- shared enums, mirroring packages/core's typed states ----
export const taskStatusEnum = pgEnum('task_status', [
  'READY',
  'NEEDS_INFO',
  'UNCERTAIN',
  'BLOCKED',
  'AWAITING_REVIEW',
  'APPROVED',
  'COMPLETED',
  'FAILED'
])
export const permissionLevelEnum = pgEnum('permission_level', ['LOW', 'MEDIUM', 'HIGH'])
export const approvalStatusEnum = pgEnum('approval_status', ['AWAITING_REVIEW', 'APPROVED', 'REJECTED'])
export const teacherRoleEnum = pgEnum('teacher_role', ['teacher', 'tutor'])
export const assignmentStatusEnum = pgEnum('assignment_status', ['todo', 'in_progress', 'done'])
export const opportunityStatusEnum = pgEnum('opportunity_status', [
  'DISCOVERED',
  'ELIGIBILITY_CHECK',
  'RECOMMENDED',
  'APPLYING',
  'AWAITING_REVIEW',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED'
])
export const leadStatusEnum = pgEnum('lead_status', ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'])
export const outreachStatusEnum = pgEnum('outreach_status', [
  'DRAFT',
  'AWAITING_REVIEW',
  'APPROVED',
  'REJECTED',
  'SENT',
  'FAILED'
])
export const integrationStatusEnum = pgEnum('integration_status', ['NOT_CONNECTED', 'CONNECTED', 'ERROR'])
export const integrationProviderEnum = pgEnum('integration_provider', ['google_calendar', 'gmail', 'lms'])
export const notificationStatusEnum = pgEnum('notification_status', [
  'PENDING',
  'SENT',
  'FAILED',
  'PERMISSION_DENIED'
])
export const aiTaskKindEnum = pgEnum('ai_task_kind', ['generate', 'classify', 'extract', 'summarize', 'analyze'])

// ---- identity ----
// `users` mirrors Supabase auth.users (id is the Supabase auth uid); Profile holds app-specific fields.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  ...timestamps
})

export const profiles = pgTable('profiles', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  fullName: text('full_name'),
  timezone: text('timezone').default('UTC'),
  gradeLevel: text('grade_level'),
  schoolName: text('school_name'),
  businessName: text('business_name'),
  ...timestamps
})

// ---- school domain ----
export const subjects = pgTable('subjects', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  ...timestamps
})

export const teachers = pgTable('teachers', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  role: teacherRoleEnum('role').notNull().default('teacher'),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  ...timestamps
})

export const topics = pgTable('topics', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  masteryLevel: integer('mastery_level').notNull().default(0),
  ...timestamps
})

export const assignments = pgTable('assignments', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  instructions: text('instructions'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  priority: integer('priority').notNull().default(3),
  status: assignmentStatusEnum('status').notNull().default('todo'),
  contextState: taskStatusEnum('context_state').notNull().default('READY'),
  sourceRawText: text('source_raw_text'),
  ...timestamps
})

export const exams = pgTable('exams', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  examDate: timestamp('exam_date', { withTimezone: true }).notNull(),
  weight: integer('weight'),
  notes: text('notes'),
  ...timestamps
})

export const studySessions = pgTable('study_sessions', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  status: assignmentStatusEnum('status').notNull().default('todo'),
  ...timestamps
})

export const studyResults = pgTable('study_results', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  studySessionId: uuid('study_session_id')
    .notNull()
    .references(() => studySessions.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  score: integer('score'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const mistakes = pgTable('mistakes', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  sourceType: text('source_type'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  resolved: boolean('resolved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const resources = pgTable('resources', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  url: text('url'),
  type: text('type'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// ---- opportunity domain ----
export const opportunities = pgTable('opportunities', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  org: text('org'),
  type: text('type'),
  url: text('url'),
  deadline: timestamp('deadline', { withTimezone: true }),
  description: text('description'),
  status: opportunityStatusEnum('status').notNull().default('DISCOVERED'),
  eligibilityNotes: text('eligibility_notes'),
  source: text('source').notNull().default('manual'),
  ...timestamps
})

export const applications = pgTable('applications', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id')
    .notNull()
    .references(() => opportunities.id, { onDelete: 'cascade' }),
  status: opportunityStatusEnum('status').notNull().default('APPLYING'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  notes: text('notes'),
  ...timestamps
})

// ---- calendar ----
export const calendarEvents = pgTable('calendar_events', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }),
  allDay: boolean('all_day').notNull().default(false),
  sourceType: text('source_type').notNull().default('manual'),
  sourceId: uuid('source_id'),
  googleEventId: text('google_event_id'),
  ...timestamps
})

// ---- business CRM domain ----
export const businessLeads = pgTable('business_leads', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  status: leadStatusEnum('status').notNull().default('NEW'),
  value: numeric('value'),
  notes: text('notes'),
  ...timestamps
})

export const contacts = pgTable('contacts', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').references(() => businessLeads.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const outreach = pgTable('outreach', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => businessLeads.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  channel: text('channel').notNull().default('email'),
  draftSubject: text('draft_subject'),
  draftBody: text('draft_body').notNull(),
  status: outreachStatusEnum('status').notNull().default('DRAFT'),
  approvalId: uuid('approval_id'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  ...timestamps
})

export const followUps = pgTable('follow_ups', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').references(() => businessLeads.id, { onDelete: 'cascade' }),
  outreachId: uuid('outreach_id').references(() => outreach.id, { onDelete: 'set null' }),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  notes: text('notes'),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// ---- AI / governance ----
export const aiTasks = pgTable('ai_tasks', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: aiTaskKindEnum('kind').notNull(),
  agent: text('agent').notNull(),
  model: text('model').notNull(),
  promptTokensEst: integer('prompt_tokens_est').notNull().default(0),
  completionTokensEst: integer('completion_tokens_est').notNull().default(0),
  costEstUsd: numeric('cost_est_usd').notNull().default('0'),
  contextState: taskStatusEnum('context_state').notNull(),
  status: taskStatusEnum('status').notNull(),
  inputSummary: text('input_summary'),
  outputSummary: text('output_summary'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const approvals = pgTable('approvals', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  taskRef: text('task_ref').notNull(),
  action: text('action').notNull(),
  riskLevel: permissionLevelEnum('risk_level').notNull(),
  status: approvalStatusEnum('status').notNull().default('AWAITING_REVIEW'),
  summary: text('summary').notNull(),
  payload: jsonb('payload').default({}),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decidedBy: uuid('decided_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const notifications = pgTable('notifications', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body'),
  url: text('url'),
  channel: text('channel').notNull().default('web_push'),
  status: notificationStatusEnum('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true })
})

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const activityLog = pgTable('activity_log', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agent: text('agent').notNull(),
  task: text('task').notNull(),
  contextState: taskStatusEnum('context_state').notNull(),
  action: text('action').notNull(),
  status: taskStatusEnum('status').notNull(),
  resultSummary: jsonb('result_summary'),
  error: text('error'),
  linkedApprovalId: uuid('linked_approval_id').references(() => approvals.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const integrations = pgTable('integrations', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: integrationProviderEnum('provider').notNull(),
  status: integrationStatusEnum('status').notNull().default('NOT_CONNECTED'),
  scopes: text('scopes').array(),
  accessTokenEnc: text('access_token_enc'),
  refreshTokenEnc: text('refresh_token_enc'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  meta: jsonb('meta').default({}),
  ...timestamps
})

export const agentConfigs = pgTable('agent_configs', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agent: text('agent').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').default({}),
  ...timestamps
})
