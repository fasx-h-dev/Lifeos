'use client'
import { useEffect, useMemo, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'

type LogEntry = {
  id: string
  agent: string
  task: string
  contextState: string
  action: string
  status: string
  error: string | null
  createdAt: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [agentFilter, setAgentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetch('/api/audit')
      .then((r) => r.json())
      .then((d) => {
        setLogs(d)
        setLoading(false)
      })
  }, [])

  const agents = useMemo(() => ['all', ...Array.from(new Set(logs.map((l) => l.agent)))], [logs])
  const statuses = useMemo(() => ['all', ...Array.from(new Set(logs.map((l) => l.status)))], [logs])

  const filtered = logs.filter((l) => (agentFilter === 'all' || l.agent === agentFilter) && (statusFilter === 'all' || l.status === statusFilter))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Control Room — Audit Log</h1>
      <p className="text-sm text-gray-500">Every agent action, every time — time, agent, task, context state, action, status, result/error.</p>

      <div className="flex gap-3">
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="border rounded p-1 text-sm">
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded p-1 text-sm">
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-2">Time</th>
                <th className="p-2">Agent</th>
                <th className="p-2">Task</th>
                <th className="p-2">Context</th>
                <th className="p-2">Action</th>
                <th className="p-2">Status</th>
                <th className="p-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="p-2 whitespace-nowrap text-gray-400">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="p-2">{l.agent}</td>
                  <td className="p-2">{l.task}</td>
                  <td className="p-2">
                    <StatusBadge status={l.contextState} />
                  </td>
                  <td className="p-2 text-gray-500">{l.action}</td>
                  <td className="p-2">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="p-2 text-red-600">{l.error ?? ''}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-400">
                    No matching activity
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
