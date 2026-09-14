'use client'
import { useEffect, useState } from 'react'

type State = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/** Real Web Push permission/subscription state — never claims "notifications on" unless a subscription actually exists. */
export default function PushSetup() {
  const [state, setState] = useState<State>('default')
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    setState(Notification.permission as State)
    fetch('/api/push/vapid-public-key')
      .then((r) => r.json())
      .then((d) => setServerConfigured(Boolean(d.configured)))
  }, [])

  const enable = async () => {
    const reg = await navigator.serviceWorker.register('/sw.js')
    const permission = await Notification.requestPermission()
    setState(permission as State)
    if (permission !== 'granted') return

    const keyRes = await fetch('/api/push/vapid-public-key').then((r) => r.json())
    if (!keyRes.configured) return

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey)
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON())
    })
    setState('subscribed')
  }

  if (state === 'unsupported') return <p className="text-xs text-gray-500">Push notifications aren&apos;t supported in this browser.</p>

  return (
    <div className="text-xs text-gray-600 space-y-1">
      <p>
        Push permission: <strong>{state}</strong>
        {serverConfigured === false && ' — VAPID keys not set on the server yet'}
      </p>
      {state !== 'granted' && state !== 'subscribed' && serverConfigured && (
        <button onClick={enable} className="text-indigo-600 underline">
          Enable notifications
        </button>
      )}
    </div>
  )
}
