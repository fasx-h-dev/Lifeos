import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { explainTopic } from '@lifeos/agents'

export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { question?: string; topicContext?: string }
  if (!body.question) return NextResponse.json({ error: 'question is required' }, { status: 400 })
  const outcome = await explainTopic(
    { db: ctx.db, userId: ctx.user.id, ai: ctx.ai, auditSink: ctx.auditSink },
    { question: body.question, topicContext: body.topicContext ?? '' }
  )
  return NextResponse.json(outcome)
}
