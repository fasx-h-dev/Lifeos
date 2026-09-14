import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'
import { integrationsRepo } from '@lifeos/db'

const PROVIDERS = ['google_calendar', 'gmail', 'lms'] as const

/** Real status only — NOT_CONNECTED until an actual OAuth token exists, never faked. */
export async function GET() {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error
  const statuses = await Promise.all(
    PROVIDERS.map(async (provider) => ({ provider, status: await integrationsRepo.getStatus(ctx.db, ctx.user.id, provider) }))
  )
  return NextResponse.json({
    statuses,
    googleOAuthConfigured: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)
  })
}
