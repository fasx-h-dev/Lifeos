'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'

type Subject = { id: string; name: string }
type Teacher = { id: string; name: string; role: 'teacher' | 'tutor'; subjectId: string | null; email: string | null; phone: string | null }
type Assignment = { id: string; title: string; instructions: string | null; dueDate: string | null; priority: number; status: string; contextState: string }
type Exam = { id: string; title: string; examDate: string; weight: number | null }

export default function SchoolPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [exams, setExams] = useState<Exam[]>([])

  const [subjectName, setSubjectName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [teacherRole, setTeacherRole] = useState<'teacher' | 'tutor'>('teacher')
  const [rawText, setRawText] = useState('')
  const [extractOutcome, setExtractOutcome] = useState<any>(null)
  const [extracting, setExtracting] = useState(false)
  const [examTitle, setExamTitle] = useState('')
  const [examDate, setExamDate] = useState('')

  const loadAll = async () => {
    const [s, t, a, e] = await Promise.all([
      fetch('/api/subjects').then((r) => r.json()),
      fetch('/api/teachers').then((r) => r.json()),
      fetch('/api/assignments').then((r) => r.json()),
      fetch('/api/exams').then((r) => r.json())
    ])
    setSubjects(s)
    setTeachers(t)
    setAssignments(a)
    setExams(e)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subjectName.trim()) return
    await fetch('/api/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: subjectName }) })
    setSubjectName('')
    loadAll()
  }

  const addTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacherName.trim()) return
    await fetch('/api/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: teacherName, role: teacherRole }) })
    setTeacherName('')
    loadAll()
  }

  const addExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examTitle.trim() || !examDate) return
    await fetch('/api/exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: examTitle, examDate }) })
    setExamTitle('')
    setExamDate('')
    loadAll()
  }

  const extract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawText.trim()) return
    setExtracting(true)
    setExtractOutcome(null)
    const res = await fetch('/api/assignments/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText }) })
    const outcome = await res.json()
    setExtractOutcome(outcome)
    setExtracting(false)
    if (outcome.status === 'COMPLETED') {
      setRawText('')
      loadAll()
    }
  }

  const toggleDone = async (a: Assignment) => {
    await fetch(`/api/assignments/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: a.status === 'done' ? 'todo' : 'done' })
    })
    loadAll()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">School</h1>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Paste an assignment (AI extract → Context Gate → store)</h2>
        <p className="text-xs text-gray-500 mb-2">
          Nothing is saved unless the extraction is complete and unambiguous. Missing info returns NEEDS_INFO; conflicting dates return
          UNCERTAIN — either way, nothing is guessed or written.
        </p>
        <form onSubmit={extract} className="space-y-2">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full border rounded p-2 text-sm"
            rows={4}
            placeholder="Paste the assignment text from your teacher/LMS here..."
          />
          <button disabled={extracting} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
            {extracting ? 'Extracting...' : 'Extract & save'}
          </button>
        </form>
        {extractOutcome && (
          <div className="mt-3 text-sm border rounded p-2">
            <StatusBadge status={extractOutcome.status} />
            {extractOutcome.status === 'NEEDS_INFO' && <p className="mt-1 text-gray-600">Missing: {extractOutcome.missing.join(', ')}</p>}
            {extractOutcome.status === 'UNCERTAIN' && <p className="mt-1 text-gray-600">{extractOutcome.reason}</p>}
            {extractOutcome.status === 'BLOCKED' && (
              <p className="mt-1 text-gray-600">
                {extractOutcome.reason} — {extractOutcome.instructions}
              </p>
            )}
            {extractOutcome.status === 'FAILED' && <p className="mt-1 text-red-600">{extractOutcome.error}</p>}
          </div>
        )}
      </section>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-400">No assignments yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id} className="border rounded p-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-gray-400">{a.dueDate ? new Date(a.dueDate).toLocaleString() : 'No due date'} • priority {a.priority}</div>
                </div>
                <button onClick={() => toggleDone(a)} className="text-xs text-indigo-600">
                  {a.status === 'done' ? 'Undo' : 'Mark done'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-white rounded shadow p-4">
          <h2 className="font-medium mb-2">Subjects</h2>
          <form onSubmit={addSubject} className="flex gap-2 mb-2">
            <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="flex-1 border rounded p-1 text-sm" placeholder="Physics" />
            <button className="text-sm bg-gray-800 text-white px-2 rounded">Add</button>
          </form>
          <ul className="text-sm space-y-1">
            {subjects.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded shadow p-4">
          <h2 className="font-medium mb-2">Teachers / tutors</h2>
          <p className="text-xs text-gray-500 mb-2">Only what you enter here is ever used — names are never inferred or looked up automatically.</p>
          <form onSubmit={addTeacher} className="space-y-2 mb-2">
            <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className="w-full border rounded p-1 text-sm" placeholder="Ms. Rivera" />
            <select value={teacherRole} onChange={(e) => setTeacherRole(e.target.value as 'teacher' | 'tutor')} className="w-full border rounded p-1 text-sm">
              <option value="teacher">Teacher</option>
              <option value="tutor">Tutor</option>
            </select>
            <button className="text-sm bg-gray-800 text-white px-2 py-1 rounded w-full">Add</button>
          </form>
          <ul className="text-sm space-y-1">
            {teachers.map((t) => (
              <li key={t.id}>
                {t.name} <span className="text-xs text-gray-400">({t.role})</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded shadow p-4">
          <h2 className="font-medium mb-2">Exams</h2>
          <form onSubmit={addExam} className="space-y-2 mb-2">
            <input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="w-full border rounded p-1 text-sm" placeholder="Midterm" />
            <input type="datetime-local" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="w-full border rounded p-1 text-sm" />
            <button className="text-sm bg-gray-800 text-white px-2 py-1 rounded w-full">Add</button>
          </form>
          <ul className="text-sm space-y-1">
            {exams.map((ex) => (
              <li key={ex.id}>
                {ex.title} — {new Date(ex.examDate).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
