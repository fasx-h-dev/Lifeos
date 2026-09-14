import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { pushSubscriptionsRepo } from '@lifeos/db'

export async function POST(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const body = (await req.json()) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'endpoint and keys.{p256dh,auth} are required' }, { status: 400 })
  }
  const row = await pushSubscriptionsRepo.upsert(ctx.db, ctx.user.id, { endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth })
  return NextResponse.json(row, { status: 201 })
}
