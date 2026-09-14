import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { calendarRepo, assignmentsRepo, examsRepo } from '@lifeos/db'

/** Aggregates every dated entity (assignments, exams, and anything already in calendar_events) into one range. */
export async function GET(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const url = new URL(req.url)
  const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : new Date(Date.now() - 7 * 86400_000)
  const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : new Date(Date.now() + 30 * 86400_000)

  const [assignments, exams] = await Promise.all([assignmentsRepo.list(ctx.db, ctx.user.id), examsRepo.list(ctx.db, ctx.user.id)])

  await Promise.all([
    ...assignments
      .filter((a) => a.dueDate)
      .map((a) => calendarRepo.upsertFromSource(ctx.db, ctx.user.id, { sourceType: 'assignment', sourceId: a.id, title: `Due: ${a.title}`, startAt: a.dueDate as Date })),
    ...exams.map((e) => calendarRepo.upsertFromSource(ctx.db, ctx.user.id, { sourceType: 'exam', sourceId: e.id, title: `Exam: ${e.title}`, startAt: e.examDate }))
  ])

  const events = await calendarRepo.listRange(ctx.db, ctx.user.id, from, to)
  return NextResponse.json(events)
}
