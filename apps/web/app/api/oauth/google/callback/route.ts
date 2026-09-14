import { NextResponse } from 'next/server'
import { createCipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getAuthedUser } from '@/lib/auth'
import { getServerDb } from '@/lib/serverDb'
import { schema } from '@lifeos/db'
import { eq, and } from 'drizzle-orm'

/**
 * Real /api/oauth/callback route: exchanges the authorization code for tokens and stores
 * them encrypted at rest. Requires GOOGLE_OAUTH_CLIENT_ID/SECRET, which aren't set in this
 * build — so this correctly 501s with setup instructions instead of pretending to connect.
 *
 * Two checks that are NOT optional here:
 *  1. The caller must have a real, current session (getAuthedUser) — the user this token
 *     gets attached to is read from THAT session, never from the redirect URL.
 *  2. `state` must match the nonce this server issued in /oauth/google/start, read back
 *     from its own httpOnly cookie — otherwise this is a classic OAuth CSRF: an attacker
 *     completes their own Google consent and tricks a logged-in victim's browser into
 *     hitting this callback, linking the attacker's Google account into the victim's
 *     LifeOS integration.
 */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY
  if (!clientId || !clientSecret || !encryptionKey) {
    return NextResponse.json(
      {
        error: 'NOT_CONNECTED',
        instructions: 'Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY to complete Google integration.'
      },
      { status: 501 }
    )
  }

  const authedUser = await getAuthedUser()
  if (!authedUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const userId = authedUser.id

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')
  const jar = await cookies()
  const expectedState = jar.get('google_oauth_state')?.value

  const stateValid =
    !!returnedState &&
    !!expectedState &&
    returnedState.length === expectedState.length &&
    timingSafeEqual(Buffer.from(returnedState), Buffer.from(expectedState))
  if (!code || !stateValid) {
    return NextResponse.json({ error: 'Invalid or expired OAuth state' }, { status: 400 })
  }

  const redirectUri = new URL('/api/oauth/google/callback', req.url).toString()
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
  })
  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 502 })
  }
  const tokens = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in: number }

  const db = await getServerDb()
  const encrypt = (plain: string) => {
    const iv = randomBytes(12)
    const key = createHash('sha256').update(encryptionKey).digest()
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64')
  }

  const existing = await db.query.integrations.findFirst({
    where: and(eq(schema.integrations.userId, userId), eq(schema.integrations.provider, 'google_calendar'))
  })
  const values = {
    status: 'CONNECTED' as const,
    scopes: ['calendar.readonly', 'gmail.readonly'],
    accessTokenEnc: encrypt(tokens.access_token),
    refreshTokenEnc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    updatedAt: new Date()
  }
  if (existing) {
    await db.update(schema.integrations).set(values).where(eq(schema.integrations.id, existing.id))
  } else {
    await db.insert(schema.integrations).values({ userId, provider: 'google_calendar', ...values })
  }

  const res = NextResponse.redirect(new URL('/dashboard', req.url))
  res.cookies.delete('google_oauth_state')
  return res
}
