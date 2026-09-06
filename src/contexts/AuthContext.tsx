import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const ensureProfile = async (u: User | null) => {
      if (!u) return
      try {
        await supabase.from('profiles').upsert({ id: u.id, full_name: (u.email ?? '').split('@')[0] }).select()
      } catch (e) {
        console.error('Error upserting profile', e)
      }
    }

    const getSession = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession()
        if (!isMounted) return
        setSession(session)
        setUser(session?.user ?? null)
        // ensure profile exists for the signed-in user
        await ensureProfile(session?.user ?? null)
      } catch (err) {
        console.error('Error getting session', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    getSession()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      // ensure profile exists when auth state changes
      ensureProfile(session?.user ?? null)
    })

    return () => {
      isMounted = false
      try {
        data.subscription.unsubscribe()
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>{children}</AuthContext.Provider>
  )
}
