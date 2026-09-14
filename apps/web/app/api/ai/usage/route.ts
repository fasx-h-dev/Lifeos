import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { aiTasksRepo } from '@lifeos/db'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const [tasks, totalCostUsd] = await Promise.all([aiTasksRepo.list(ctx.db, ctx.user.id, 50), aiTasksRepo.totalCostUsd(ctx.db, ctx.user.id)])
  return NextResponse.json({ tasks, totalCostUsd, isConfigured: ctx.ai.isConfigured })
}
