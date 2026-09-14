'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'

type PlanItem = { kind: string; refId: string; title: string; reason: string }

export default function StudyPage() {
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [answer, setAnswer] = useState<any>(null)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    fetch('/api/study/plan')
      .then((r) => r.json())
      .then((d) => {
        setPlan(d)
        setLoading(false)
      })
  }, [])

  const ask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setAsking(true)
    setAnswer(null)
    const res = await fetch('/api/study/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, topicContext: context }) })
    setAnswer(await res.json())
    setAsking(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Study</h1>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Tonight&apos;s study plan</h2>
        <p className="text-xs text-gray-500 mb-2">Deterministic ranking from your deadlines and exams — no AI involved in the ordering itself.</p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : plan.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing urgent — you&apos;re caught up.</p>
        ) : (
          <ol className="space-y-1 text-sm list-decimal list-inside">
            {plan.map((p) => (
              <li key={p.refId}>
                <span className="font-medium">{p.title}</span> <span className="text-gray-400 text-xs">— {p.reason}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Ask for an explanation (AI, on demand only)</h2>
        <form onSubmit={ask} className="space-y-2">
          <textarea value={context} onChange={(e) => setContext(e.target.value)} className="w-full border rounded p-2 text-sm" rows={2} placeholder="Paste the relevant notes/topic here for context (optional but recommended)" />
          <input value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="What do you want explained?" />
          <button disabled={asking} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
            {asking ? 'Asking...' : 'Ask'}
          </button>
        </form>
        {answer && (
          <div className="mt-3 text-sm border rounded p-2">
            <StatusBadge status={answer.status} />
            {answer.status === 'COMPLETED' && <p className="mt-2 whitespace-pre-wrap">{answer.data}</p>}
            {answer.status === 'BLOCKED' && (
              <p className="mt-1 text-gray-600">
                {answer.reason} — {answer.instructions}
              </p>
            )}
            {answer.status === 'FAILED' && <p className="mt-1 text-red-600">{answer.error}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
