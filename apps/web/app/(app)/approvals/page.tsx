'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'

type Approval = {
  id: string
  taskRef: string
  action: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'AWAITING_REVIEW' | 'APPROVED' | 'REJECTED'
  summary: string
  payload: { outreachId?: string } | null
  createdAt: string
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/approvals')
    setApprovals(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const decide = async (a: Approval, decision: 'APPROVED' | 'REJECTED') => {
    setBusyId(a.id)
    const outreachId = a.payload?.outreachId
    const url = outreachId ? `/api/outreach/${outreachId}/decide` : `/api/approvals/${a.id}/decide`
    const body = outreachId ? { approvalId: a.id, decision } : { decision }
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await load()
    setBusyId(null)
  }

  const pending = approvals.filter((a) => a.status === 'AWAITING_REVIEW')
  const decided = approvals.filter((a) => a.status !== 'AWAITING_REVIEW')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Approval Queue</h1>
      <p className="text-sm text-gray-500">
        Silence is never approval. Nothing here auto-approves — every MEDIUM/HIGH action waits for an explicit click.
      </p>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-3">Awaiting your review ({pending.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing waiting on you right now.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((a) => (
              <li key={a.id} className="border rounded p-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.riskLevel} />
                    <span className="font-medium text-sm">{a.summary}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{a.action} • {new Date(a.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={busyId === a.id}
                    onClick={() => decide(a, 'APPROVED')}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === a.id}
                    onClick={() => decide(a, 'REJECTED')}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-3">Decided</h2>
        {decided.length === 0 ? (
          <p className="text-sm text-gray-400">No decisions yet.</p>
        ) : (
          <ul className="space-y-2">
            {decided.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.summary}</span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
