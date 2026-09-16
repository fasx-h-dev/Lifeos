'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient'

export default function LoginPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    setMessage(error ? error.message : 'Magic link sent — check your email.')
    setLoading(false)
  }

  const devLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const res = await fetch('/api/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    if (res.ok) {
      router.replace('/dashboard')
    } else {
      setMessage('Dev login failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">Sign in to LifeOS</h1>

        {supabase ? (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <p className="text-sm text-gray-500">Enter your email and we&apos;ll send you a magic link.</p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="you@example.com"
            />
            <button disabled={loading} className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        ) : (
          <form onSubmit={devLogin} className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-2">
              <strong>DEV MODE.</strong> No Supabase project is configured yet
              (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY), so this is a local-only
              stand-in login, not real authentication. It is hard-disabled in production.
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="dev@example.com"
            />
            <button disabled={loading} className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Continue (dev mode)'}
            </button>
          </form>
        )}

        {message && <p className="text-sm text-gray-700">{message}</p>}
      </div>
    </div>
  )
}
