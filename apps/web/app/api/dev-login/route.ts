import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { isSupabaseConfigured } from '@/lib/auth'
import { getServerDb } from '@/lib/serverDb'
import { upsertUser, ensureProfile } from '@lifeos/db'

/**
 * DEV-ONLY stand-in for real Supabase auth, used only when no Supabase project is
 * configured. Hard-disabled in production so it can never substitute for real auth
 * in a deployed app.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production' || isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Dev login is disabled' }, { status: 403 })
  }
  const { email } = (await req.json()) as { email?: string }
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const db = await getServerDb()
  // deterministic id per email so repeat dev logins reuse the same user/profile
  const id = emailToDevUuid(email)
  const user = await upsertUser(db, { id, email })
  await ensureProfile(db, user.id, { fullName: email.split('@')[0] })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('lifeos_dev_user', JSON.stringify({ id: user.id, email: user.email }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  })
  return res
}

function emailToDevUuid(email: string): string {
  const hex = createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
