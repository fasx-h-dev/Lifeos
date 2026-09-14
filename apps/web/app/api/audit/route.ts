import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { activityLogRepo } from '@lifeos/db'

export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const rows = await activityLogRepo.list(ctx.db, ctx.user.id, 200)
  return NextResponse.json(rows)
}
