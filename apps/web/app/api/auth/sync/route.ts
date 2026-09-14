import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/lib/auth'
import { getServerDb } from '@/lib/serverDb'
import { upsertUser, ensureProfile } from '@lifeos/db'

/** Called by the client right after Supabase confirms a magic-link sign-in, to mirror the
 *  session into an httpOnly cookie our server-side API routes can read. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'Supabase not configured' }, { status: 400 })
  const { accessToken } = (await req.json()) as { accessToken?: string }
  if (!accessToken) return NextResponse.json({ error: 'accessToken required' }, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const db = await getServerDb()
  const user = await upsertUser(db, { id: data.user.id, email: data.user.email ?? '' })
  await ensureProfile(db, user.id, { fullName: (data.user.email ?? '').split('@')[0] })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('sb-access-token', accessToken, { httpOnly: true, sameSite: 'lax', path: '/', secure: true })
  return res
}
