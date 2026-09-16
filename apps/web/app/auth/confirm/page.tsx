'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ConfirmForm() {
  const router = useRouter()
  const params = useSearchParams()
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    if (!tokenHash || !type) {
      setError('This confirmation link is missing required parameters.')
      setStatus('error')
      return
    }
    setStatus('loading')
    const res = await fetch('/api/auth/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_hash: tokenHash, type })
    })
    if (res.ok) {
      router.replace('/dashboard')
      return
    }
    const data = await res.json().catch(() => ({}))
    setError(data.error || 'This link is invalid or has already been used.')
    setStatus('error')
  }

  return (
    <div className="max-w-md w-full bg-white rounded shadow p-6 space-y-4 text-center">
      <h1 className="text-xl font-semibold">Confirm sign-in</h1>
      <p className="text-sm text-gray-500">
        Click below to finish signing in to LifeOS.
      </p>
      <button
        onClick={confirm}
        disabled={status === 'loading' || !tokenHash || !type}
        className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50"
      >
        {status === 'loading' ? 'Signing in...' : 'Confirm sign-in'}
      </button>
      {error && (
        <p className="text-sm text-red-600">
          {error}{' '}
          <a href="/login" className="underline">
            Back to login
          </a>
        </p>
      )}
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <ConfirmForm />
      </Suspense>
    </div>
  )
}
