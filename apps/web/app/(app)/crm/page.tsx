'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'

type Lead = { id: string; name: string; company: string | null; status: string }
type Outreach = { id: string; leadId: string; draftBody: string; status: string; approvalId: string | null }

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [outreach, setOutreach] = useState<Outreach[]>([])
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [leadId, setLeadId] = useState('')
  const [goal, setGoal] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [draftOutcome, setDraftOutcome] = useState<any>(null)

  const load = async () => {
    const [l, o] = await Promise.all([fetch('/api/leads').then((r) => r.json()), fetch('/api/outreach').then((r) => r.json())])
    setLeads(l)
    setOutreach(o)
  }
  useEffect(() => {
    load()
  }, [])

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, company }) })
    setName('')
    setCompany('')
    load()
  }

  const draft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadId || !goal.trim()) return
    setDrafting(true)
    setDraftOutcome(null)
    const res = await fetch('/api/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId, goal, businessContext: 'Small student-run tutoring/services business.' }) })
    const outcome = await res.json()
    setDraftOutcome(outcome)
    setDrafting(false)
    if (outcome.status === 'AWAITING_REVIEW') {
      setGoal('')
      load()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Business CRM</h1>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Leads</h2>
        <form onSubmit={addLead} className="flex gap-2 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 border rounded p-2 text-sm" placeholder="Contact name" />
          <input value={company} onChange={(e) => setCompany(e.target.value)} className="flex-1 border rounded p-2 text-sm" placeholder="Company (optional)" />
          <button className="bg-gray-800 text-white px-3 py-1 rounded text-sm">Add</button>
        </form>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400">No leads yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {leads.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>
                  {l.name} {l.company && <span className="text-gray-400">({l.company})</span>}
                </span>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Draft outreach (always goes to Approval Queue — HIGH risk)</h2>
        <p className="text-xs text-gray-500 mb-2">
          There is no button here that actually sends anything — no email provider is connected yet. Approving a draft only marks it
          approved; it stays unsent until Gmail/SendGrid is wired up.
        </p>
        <form onSubmit={draft} className="space-y-2">
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="w-full border rounded p-2 text-sm">
            <option value="">Select a lead...</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Goal, e.g. 'schedule an intro call'" />
          <button disabled={drafting} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
            {drafting ? 'Drafting...' : 'Draft with AI'}
          </button>
        </form>
        {draftOutcome && (
          <div className="mt-3 text-sm border rounded p-2">
            <StatusBadge status={draftOutcome.status} />
            {draftOutcome.status === 'BLOCKED' && (
              <p className="mt-1 text-gray-600">
                {draftOutcome.reason} — {draftOutcome.instructions}
              </p>
            )}
            {draftOutcome.status === 'AWAITING_REVIEW' && <p className="mt-1 text-gray-600">Sent to the Approval Queue for your review.</p>}
          </div>
        )}
      </section>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Outreach drafts</h2>
        {outreach.length === 0 ? (
          <p className="text-sm text-gray-400">No drafts yet.</p>
        ) : (
          <ul className="space-y-2">
            {outreach.map((o) => (
              <li key={o.id} className="border rounded p-2 text-sm">
                <StatusBadge status={o.status} />
                <p className="mt-1 whitespace-pre-wrap text-gray-700">{o.draftBody}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
