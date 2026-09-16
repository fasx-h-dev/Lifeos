import 'server-only'
import { cookies } from 'next/headers'
import { getSupabaseServerClient } from './supabase/serverClient'

export type AuthedUser = { id: string; email: string }

const DEV_COOKIE = 'lifeos_dev_user'

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Resolves the signed-in user for the current request.
 *
 * Real path: reads the session from the @supabase/ssr cookie-backed client and calls
 * getUser() (not getSession()) — getUser() revalidates the token against Supabase's own
 * Auth server rather than just trusting whatever's in the cookie.
 *
 * Dev-only fallback: when no Supabase project is configured yet AND we are not in
 * production, reads a plain `lifeos_dev_user` cookie set by /api/dev-login. Hard-disabled
 * in production — see the NODE_ENV check below.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return { id: data.user.id, email: data.user.email ?? '' }
  }

  if (process.env.NODE_ENV === 'production') return null
  const jar = await cookies()
  const raw = jar.get(DEV_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.id === 'string' && typeof parsed.email === 'string') return parsed
    return null
  } catch {
    return null
  }
}

export async function requireAuthedUser(): Promise<AuthedUser> {
  const user = await getAuthedUser()
  if (!user) throw new AuthError()
  return user
}

export class AuthError extends Error {
  constructor() {
    super('Not authenticated')
    this.name = 'AuthError'
  }
}
