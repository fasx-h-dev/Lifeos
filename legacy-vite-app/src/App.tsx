import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assignments from './pages/Assignments'

function AppContent() {
  const { user, loading, signOut } = useAuth()
  const [page, setPage] = useState<'dashboard' | 'assignments'>('dashboard')

  if (loading) return <div className="p-8">Checking auth...</div>
  if (!user) return <Login />

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white p-4 shadow flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setPage('dashboard')} className={`px-3 py-1 ${page === 'dashboard' ? 'font-semibold' : ''}`}>Dashboard</button>
          <button onClick={() => setPage('assignments')} className={`px-3 py-1 ${page === 'assignments' ? 'font-semibold' : ''}`}>Assignments</button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">{user?.email}</div>
          <button onClick={() => signOut()} className="text-sm text-red-600">Sign out</button>
        </div>
      </nav>

      <main className="p-8">
        {page === 'dashboard' ? <Dashboard /> : <Assignments />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
