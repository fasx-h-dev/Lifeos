import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import AssignmentForm from '../components/AssignmentForm'
import AssignmentItem from '../components/AssignmentItem'

type Assignment = {
  id: string
  user_id: string
  subject: string
  instructions?: string
  due_date?: string | null
  priority: number
  status: 'todo' | 'in_progress' | 'done'
  created_at?: string
  updated_at?: string
}

export default function Assignments() {
  const { user, loading } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [editing, setEditing] = useState<Assignment | null>(null)

  const fetchAssignments = async () => {
    if (!user) return
    setLoadingData(true)
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })
      .order('priority', { ascending: true })
    if (error) console.error('Error fetching assignments', error)
    else setAssignments(data as Assignment[])
    setLoadingData(false)
  }

  useEffect(() => {
    fetchAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleCreate = async (payload: Partial<Assignment>) => {
    if (!user) return
    setLoadingData(true)
    const { data, error } = await supabase
      .from('assignments')
      .insert([{ ...payload, user_id: user.id }])
      .select()
    if (error) console.error('Error creating assignment', error)
    else if (data) setAssignments((s) => [...s, data[0]])
    setLoadingData(false)
  }

  const handleUpdate = async (id: string, updates: Partial<Assignment>) => {
    setLoadingData(true)
    const { data, error } = await supabase
      .from('assignments')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .select()
    if (error) console.error('Error updating assignment', error)
    else if (data) setAssignments((s) => s.map((a) => (a.id === id ? data[0] : a)))
    setLoadingData(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return
    setLoadingData(true)
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) console.error('Error deleting assignment', error)
    else setAssignments((s) => s.filter((a) => a.id !== id))
    setLoadingData(false)
  }

  if (loading) return <div className="p-8">Loading auth...</div>
  if (!user) return <div className="p-8">Please sign in</div>

  // compute summary for top3 priorities, urgent, workload, suggested action, progress
  const incomplete = assignments.filter(a => a.status !== 'done')
  const top3 = [...incomplete].sort((a,b) => a.priority - b.priority || (new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime())).slice(0,3)
  const urgent = incomplete.filter(a => a.due_date && (new Date(a.due_date).getTime() - Date.now()) <= 48*3600*1000)
  const workload = incomplete.length
  const workloadLevel = workload <= 3 ? 'Low' : workload <= 7 ? 'Medium' : 'High'
  const suggested = top3[0] ?? null
  const progress = assignments.length === 0 ? 0 : Math.round((assignments.filter(a=>a.status==='done').length / assignments.length) * 100)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold">Calm School Dashboard</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium">Top 3 priorities</h3>
            <ol className="mt-2 space-y-1">
              {top3.length === 0 ? <li className="text-sm text-gray-500">No high-priority items</li> :
                top3.map(a => <li key={a.id} className="text-sm">{a.subject} {a.due_date ? `• ${new Date(a.due_date).toLocaleString()}` : ''}</li>)}
            </ol>
          </div>
          <div>
            <h3 className="font-medium">Urgent deadlines</h3>
            <ul className="mt-2 space-y-1">
              {urgent.length === 0 ? <li className="text-sm text-gray-500">No urgent deadlines</li> :
                urgent.map(a => <li key={a.id} className="text-sm text-red-600">{a.subject} • due {new Date(a.due_date!).toLocaleString()}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="font-medium">Workload</h3>
            <p className="mt-2 text-sm">{workload} incomplete • Level: <strong>{workloadLevel}</strong></p>
          </div>
          <div>
            <h3 className="font-medium">Suggested next action</h3>
            <p className="mt-2 text-sm">
              {suggested
                ? `${suggested.subject} — start with: ${suggested.instructions ? suggested.instructions.split('.').slice(0,1)[0] : 'Open the assignment'}`
                : 'No suggestion'}
            </p>
            <p className="mt-2 text-sm">Progress: {progress}%</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Assignments</h3>
        <AssignmentForm onSubmit={handleCreate} />
        {loadingData ? <p>Loading...</p> :
          assignments.length === 0 ? <p className="text-sm text-gray-500 mt-3">No assignments</p> :
          <ul className="mt-4 space-y-2">
            {assignments.map(a =>
              <AssignmentItem key={a.id} assignment={a}
                onEdit={() => setEditing(a)}
                onToggleComplete={() => handleUpdate(a.id, { status: a.status === 'done' ? 'todo' : 'done' })}
                onDelete={() => handleDelete(a.id)}
              />
            )}
          </ul>
        }
      </section>

      {editing && (
        <div>
          <h4 className="font-medium">Edit</h4>
          <AssignmentForm
            initial={editing}
            onSubmit={async (payload) => { await handleUpdate(editing.id, payload); setEditing(null) }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}
    </div>
  )
}
