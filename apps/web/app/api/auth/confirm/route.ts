import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'

const ALLOWED_TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change']

/**
 * Redeems a token_hash from the confirm-sign-in button (see app/auth/confirm/page.tsx),
 * not from the raw email link. Keeping the redemption behind a button click (this POST)
 * rather than the GET the email link itself loads means an email client or security
 * gateway that auto-fetches links to generate a preview can't burn the one-time token
 * before the user actually clicks it.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const tokenHash = typeof body?.token_hash === 'string' ? body.token_hash : null
  const type = typeof body?.type === 'string' ? (body.type as EmailOtpType) : null

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Missing or invalid confirmation parameters.' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
