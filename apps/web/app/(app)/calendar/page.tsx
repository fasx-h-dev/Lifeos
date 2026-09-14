'use client'
import { useEffect, useState } from 'react'

type EventRow = { id: string; title: string; startAt: string; sourceType: string }

export default function CalendarPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/calendar')
      .then((r) => r.json())
      .then((d) => {
        setEvents(d)
        setLoading(false)
      })
  }, [])

  const byDay = events.reduce<Record<string, EventRow[]>>((acc, e) => {
    const day = new Date(e.startAt).toDateString()
    acc[day] = acc[day] ?? []
    acc[day].push(e)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="text-sm text-gray-500">Aggregates every dated entity — assignments, exams, and (once connected) Google Calendar.</p>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : Object.keys(byDay).length === 0 ? (
        <p className="text-sm text-gray-400">Nothing scheduled in the next 30 days.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDay).map(([day, items]) => (
            <div key={day} className="bg-white rounded shadow p-4">
              <h2 className="font-medium text-sm mb-2">{day}</h2>
              <ul className="space-y-1 text-sm">
                {items.map((e) => (
                  <li key={e.id} className="flex justify-between">
                    <span>{e.title}</span>
                    <span className="text-xs text-gray-400">{e.sourceType}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
