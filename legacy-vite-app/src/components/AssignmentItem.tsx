import React from 'react'

export default function AssignmentItem({
  assignment,
  onEdit,
  onToggleComplete,
  onDelete
}: {
  assignment: any
  onEdit: () => void
  onToggleComplete: () => void
  onDelete: () => void
}) {
  const due = assignment.due_date ? new Date(assignment.due_date) : null
  const now = new Date()
  const isUrgent = due ? due.getTime() - now.getTime() <= 48 * 3600 * 1000 : false

  return (
    <li className="p-3 border rounded flex items-start justify-between">
      <div>
        <div className="font-medium">{assignment.subject}</div>
        <div className="text-xs text-gray-500">{assignment.instructions}</div>
        <div className="text-xs text-gray-500 mt-1">
          {assignment.due_date ? `Due: ${new Date(assignment.due_date).toLocaleString()}` : 'No due date'} • Priority: {assignment.priority}
          {isUrgent && <span className="ml-2 text-sm text-red-600">URGENT</span>}
          {assignment.status === 'done' && <span className="ml-2 text-sm text-green-600">COMPLETED</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <button onClick={onToggleComplete} className="text-sm text-indigo-600">{assignment.status === 'done' ? 'Undo' : 'Complete'}</button>
        <button onClick={onEdit} className="text-sm text-gray-700">Edit</button>
        <button onClick={onDelete} className="text-sm text-red-600">Delete</button>
      </div>
    </li>
  )
}
