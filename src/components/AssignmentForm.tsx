import React, { useState } from 'react'

type AssignmentPayload = {
  subject: string
  instructions?: string
  due_date?: string | null
  priority?: number
  status?: 'todo' | 'in_progress' | 'done'
}

export default function AssignmentForm({
  initial,
  onSubmit,
  onCancel
}: {
  initial?: Partial<AssignmentPayload>
  onSubmit: (payload: AssignmentPayload) => Promise<void> | void
  onCancel?: () => void
}) {
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 3)
  const [status, setStatus] = useState(initial?.status ?? 'todo')

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!subject.trim()) return alert('Subject is required')
    await onSubmit({
      subject: subject.trim(),
      instructions: instructions.trim(),
      due_date: dueDate || null,
      priority,
      status: status as any
    })
    setSubject('')
    setInstructions('')
    setDueDate('')
    setPriority(3)
    setStatus('todo')
  }

  return (
    <form onSubmit={submit} className="space-y-2 bg-white p-4 rounded shadow mt-3">
      <div>
        <label className="block text-sm font-medium">Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded p-1" />
      </div>
      <div>
        <label className="block text-sm font-medium">Instructions</label>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full border rounded p-1" />
      </div>
      <div className="flex gap-2">
        <div>
          <label className="block text-sm font-medium">Due date</label>
          <input type="datetime-local" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} className="border rounded p-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Priority</label>
          <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="border rounded p-1">
            <option value={1}>1 (High)</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5 (Low)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="border rounded p-1">
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded">Save</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-3 py-1 rounded border">Cancel</button>}
      </div>
    </form>
  )
}
