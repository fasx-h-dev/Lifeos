import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { approvalsRepo } from '@lifeos/db'

export async function GET(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const status = new URL(req.url).searchParams.get('status') as 'AWAITING_REVIEW' | 'APPROVED' | 'REJECTED' | null
  const rows = await approvalsRepo.list(ctx.db, ctx.user.id, status ?? undefined)
  return NextResponse.json(rows)
}
