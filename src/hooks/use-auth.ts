'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { profile, setProfile } = useAppStore()
  // Stable Supabase client reference — avoids re-subscribing on every render
  const supabaseRef = useRef(createClient())
  const router = useRouter()

  useEffect(() => {
    const supabase = supabaseRef.current

    async function fetchProfile(userId: string): Promise<void> {
      console.log('[AUTH] fetchProfile start', { userId })
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) {
        console.error('[AUTH] fetchProfile error', { code: error.code, message: error.message, details: error.details, hint: error.hint })
        // Do not wipe the profile on a transient network error — keep whatever we had
        return
      }
      console.log('[AUTH] fetchProfile success', { userId })
      setProfile(data)
    }

    // Fast-path: immediately resolve existing session so queries aren't blocked
    // waiting for the first onAuthStateChange callback
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AUTH] getSession error', { message: error.message })
      }
      if (session?.user) {
        console.log('[AUTH] getSession: session found', { userId: session.user.id })
        setUser(session.user)
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        console.log('[AUTH] getSession: no session')
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] onAuthStateChange', { event, userId: session?.user?.id ?? null })
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          // Only force logout on explicit sign-out — NOT on TOKEN_REFRESHED, which is
          // a normal background refresh and always carries a valid session.
          if (event === 'SIGNED_OUT') {
            console.log('[AUTH] SIGNED_OUT — redirecting to /auth')
            await supabase.auth.signOut()
            router.replace('/auth')
          }
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProfile, router])

  const signInWithGoogle = async (nextPath = '/') => {
    const safeNextPath = nextPath.startsWith('/') ? nextPath : '/'
    const { error } = await supabaseRef.current.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`,
      },
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabaseRef.current.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabaseRef.current.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    setProfile(null)
    try { await supabaseRef.current.auth.signOut() } catch { /* ignore revocation errors */ }
  }

  return { user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }
}
