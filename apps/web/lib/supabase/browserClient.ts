'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null | undefined

/**
 * Cookie-backed browser client (via @supabase/ssr) — NOT localStorage. This is what makes
 * the session visible to the server: the same cookies this client reads/writes are the
 * ones middleware.ts and lib/auth.ts's server client read on every request.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  client = url && anonKey ? createBrowserClient(url, anonKey) : null
  return client
}
