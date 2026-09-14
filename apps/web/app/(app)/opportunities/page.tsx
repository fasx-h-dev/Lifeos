'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'

type Opportunity = { id: string; title: string; org: string | null; deadline: string | null; status: string }

const NEXT: Record<string, string[]> = {
  DISCOVERED: ['ELIGIBILITY_CHECK', 'EXPIRED'],
  ELIGIBILITY_CHECK: ['RECOMMENDED', 'REJECTED', 'EXPIRED'],
  RECOMMENDED: ['APPLYING', 'EXPIRED'],
  APPLYING: ['AWAITING_REVIEW', 'EXPIRED'],
  AWAITING_REVIEW: ['SUBMITTED', 'EXPIRED'],
  SUBMITTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: []
}

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([])
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [searching, setSearching] = useState(false)

  const load = () => fetch('/api/opportunities').then((r) => r.json()).then(setItems)
  useEffect(() => {
    load()
  }, [])

  const addOpportunity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await fetch('/api/opportunities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
    setTitle('')
    load()
  }

  const transition = async (o: Opportunity, to: string) => {
    await fetch(`/api/opportunities/${o.id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: o.status, to }) })
    load()
  }

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    const res = await fetch('/api/opportunities/find', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
    setSearchResult(await res.json())
    setSearching(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Opportunities</h1>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Find opportunities (web research)</h2>
        <form onSubmit={search} className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 border rounded p-2 text-sm" placeholder="e.g. robotics scholarships for high schoolers" />
          <button disabled={searching} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
        {searchResult && (
          <div className="mt-3 text-sm border rounded p-2">
            <StatusBadge status={searchResult.status} />
            {searchResult.status === 'BLOCKED' && (
              <p className="mt-1 text-gray-600">
                {searchResult.reason} — {searchResult.instructions}
              </p>
            )}
            {searchResult.status === 'COMPLETED' && (
              <ul className="mt-2 space-y-1">
                {searchResult.data.map((r: any, i: number) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Add manually</h2>
        <form onSubmit={addOpportunity} className="flex gap-2 mb-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 border rounded p-2 text-sm" placeholder="Opportunity title" />
          <button className="bg-gray-800 text-white px-3 py-1 rounded text-sm">Add</button>
        </form>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400">No opportunities yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((o) => (
              <li key={o.id} className="border rounded p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{o.title}</div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {(NEXT[o.status] ?? []).map((next) => (
                    <button key={next} onClick={() => transition(o, next)} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
                      → {next}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
