import 'server-only'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export type AuthedUser = { id: string; email: string }

const DEV_COOKIE = 'lifeos_dev_user'

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Resolves the signed-in user for the current request.
 *
 * Real path: verifies the Supabase access token cookie against Supabase's own
 * Auth server (no extra secret needed beyond the already-documented anon key).
 *
 * Dev-only fallback: when no Supabase project is configured yet AND we are not
 * in production, reads a plain `lifeos_dev_user` cookie set by /api/dev-login.
 * This path is hard-disabled in production — see the NODE_ENV check below — so
 * it can never be mistaken for real authentication in a deployed app.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const jar = await cookies()

  if (isSupabaseConfigured()) {
    const token = jar.get('sb-access-token')?.value
    if (!token) return null
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null
    return { id: data.user.id, email: data.user.email ?? '' }
  }

  if (process.env.NODE_ENV === 'production') return null
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
