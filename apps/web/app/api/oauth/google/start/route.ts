import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/apiContext'

/** Least-privilege scopes to start: read-only Calendar + Gmail. Write scopes are added only when the feature needing them exists. */
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/gmail.readonly']

export async function GET(req: Request) {
  const ctx = await requireApiContext()
  if ('error' in ctx) return ctx.error

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'NOT_CONNECTED', instructions: 'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to enable Google integration.' },
      { status: 501 }
    )
  }

  const redirectUri = new URL('/api/oauth/google/callback', req.url).toString()
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('scope', SCOPES.join(' '))
  url.searchParams.set('state', ctx.user.id)
  return NextResponse.redirect(url.toString())
}
