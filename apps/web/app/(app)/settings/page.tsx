'use client'
import { useEffect, useState } from 'react'

type IntegrationStatus = { provider: string; status: 'NOT_CONNECTED' | 'CONNECTED' | 'ERROR' }

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  useEffect(() => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((d) => {
        setIntegrations(d.statuses)
        setGoogleConfigured(d.googleOAuthConfigured)
      })
  }, [])

  const exportData = async () => {
    const res = await fetch('/api/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = JSON.parse(text)
    const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: parsed.data }) })
    setImportResult(await res.json())
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Integrations</h2>
        <p className="text-xs text-gray-500 mb-3">
          Real status only — shown as NOT_CONNECTED until an actual OAuth token exists. Teacher/tutor names are never inferred from any
          of these; they only ever come from what you enter in School.
        </p>
        <ul className="space-y-2 text-sm">
          {integrations.map((i) => (
            <li key={i.provider} className="flex items-center justify-between">
              <span>{i.provider}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${i.status === 'CONNECTED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
            </li>
          ))}
        </ul>
        {googleConfigured ? (
          <a href="/api/oauth/google/start" className="text-sm text-indigo-600 underline mt-3 inline-block">
            Connect Google Calendar / Gmail (read-only)
          </a>
        ) : (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-3">
            Google OAuth isn&apos;t configured on this deployment yet — set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.
          </p>
        )}
      </section>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Export / Import</h2>
        <div className="flex items-center gap-4">
          <button onClick={exportData} className="bg-gray-800 text-white px-3 py-1 rounded text-sm">
            Export all data (JSON)
          </button>
          <label className="text-sm text-indigo-600 underline cursor-pointer">
            Import from file
            <input type="file" accept="application/json" onChange={importData} className="hidden" />
          </label>
        </div>
        {importResult && <pre className="mt-3 text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(importResult, null, 2)}</pre>}
      </section>
    </div>
  )
}
