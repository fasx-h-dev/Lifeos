import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { assignmentsRepo, examsRepo } from '@lifeos/db'
import { rankStudyPlan } from '@lifeos/agents'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const [assignments, exams] = await Promise.all([assignmentsRepo.list(ctx.db, ctx.user.id), examsRepo.list(ctx.db, ctx.user.id)])
  const plan = rankStudyPlan({
    now: new Date(),
    assignments: assignments.map((a) => ({ id: a.id, title: a.title, dueDate: a.dueDate, priority: a.priority, status: a.status })),
    exams: exams.map((e) => ({ id: e.id, title: e.title, examDate: e.examDate, weight: e.weight })),
    topics: []
  })
  return NextResponse.json(plan)
}
