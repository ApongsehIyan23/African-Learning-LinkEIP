import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch the profile row (role lives here). Retries briefly to cover the rare
  // race right after first signup, while the DB trigger creates the row.
  const loadProfile = useCallback(async (userId, attempt = 0) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[auth] profile load error:', error.message)
      setProfile(null)
      return
    }
    if (!data && attempt < 2) {
      await new Promise((r) => setTimeout(r, 700))
      return loadProfile(userId, attempt + 1)
    }
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      if (active) setLoading(false)
    })

    // Defer profile loading out of the callback: calling other supabase methods
    // synchronously inside onAuthStateChange can deadlock the client's lock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setTimeout(() => {
        loadProfile(newSession?.user?.id).finally(() => setLoading(false))
      }, 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signInWithEmail = useCallback(async (email) => {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signInWithEmail,
    signOut,
    reloadProfile: () => loadProfile(session?.user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
