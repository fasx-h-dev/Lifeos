import { NextResponse } from 'next/server'
import { createCipheriv, randomBytes, createHash } from 'node:crypto'
import { getServerDb } from '@/lib/serverDb'
import { schema } from '@lifeos/db'
import { eq, and } from 'drizzle-orm'

/**
 * Real /api/oauth/callback route: exchanges the authorization code for tokens and stores
 * them encrypted at rest. Requires GOOGLE_OAUTH_CLIENT_ID/SECRET, which aren't set in this
 * build — so this correctly 501s with setup instructions instead of pretending to connect.
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

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const userId = url.searchParams.get('state')
  if (!code || !userId) return NextResponse.json({ error: 'Missing code/state' }, { status: 400 })

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

  return NextResponse.redirect(new URL('/dashboard', req.url))
}
