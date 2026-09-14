import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
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

  // `state` is a random CSRF nonce, never the user id — the callback re-derives the user
  // from the session cookie, not from anything in the redirect URL. The nonce is stored
  // in its own short-lived cookie and compared exactly at the callback.
  const state = randomBytes(24).toString('hex')
  const redirectUri = new URL('/api/oauth/google/callback', req.url).toString()
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('scope', SCOPES.join(' '))
  url.searchParams.set('state', state)

  const res = NextResponse.redirect(url.toString())
  res.cookies.set('google_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/api/oauth/google', maxAge: 600 })
  return res
}
