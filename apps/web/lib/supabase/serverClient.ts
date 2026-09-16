import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Read-only server client — safe to call from Server Components (which cannot write
 * cookies) as well as Route Handlers. Session refresh (rewriting cookies when the access
 * token is near/past expiry) happens in middleware.ts before the request reaches here,
 * so this client doesn't need write access to do its job of reading the current user.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // No-op here on purpose: Server Components can't mutate response cookies, and
        // middleware.ts is what keeps the session fresh. Route Handlers that need to
        // write cookies (sign-out, the OAuth callback) build their own writable client.
      }
    }
  })
}
