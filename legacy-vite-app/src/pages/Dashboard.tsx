import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type DashboardRow = {
  id: string
  title: string
  layout: any
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const [dashboards, setDashboards] = useState<DashboardRow[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchDashboards = async () => {
      setLoadingData(true)
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('Error fetching dashboards', error)
      } else {
        setDashboards(data as DashboardRow[])
      }
      setLoadingData(false)
    }
    fetchDashboards()
  }, [user])

  if (loading) return <div className="p-8">Loading authentication...</div>
  if (!user) return <div className="p-8">Not signed in</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{user.email}'s Dashboards</h1>
          <button onClick={() => signOut()} className="text-sm text-red-600">Sign out</button>
        </div>

        <div className="mt-4">
          {loadingData ? (
            <p>Loading dashboards...</p>
          ) : dashboards.length === 0 ? (
            <p className="text-sm text-gray-500">No dashboards yet. Create one via the Supabase SQL editor or the API.</p>
          ) : (
            <ul>
              {dashboards.map((d) => (
                <li key={d.id} className="p-3 border rounded mb-2">
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{JSON.stringify(d.layout)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
