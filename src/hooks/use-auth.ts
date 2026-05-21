'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'

// Module-level singleton so every call to useAuth() shares the same client
// reference and never accidentally re-subscribes the auth listener on re-render.
const supabase = createClient()

export function useAuth() {
  const { setProfile } = useAppStore()
  const router = useRouter()
  // Guard against React StrictMode double-mount creating two simultaneous
  // onAuthStateChange subscriptions.
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (subscribedRef.current) return
    subscribedRef.current = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        // Clear local profile state on any unauthenticated event.
        setProfile(null)
        // Redirect only on an explicit sign-out.  TOKEN_REFRESHED always
        // arrives with a valid session (non-null user), so the else-branch
        // below handles that case; we never force-logout on a successful refresh.
        if (event === 'SIGNED_OUT') {
          router.replace('/auth')
        }
      }
      // When the session IS valid we intentionally do NOT re-fetch the profile
      // here.  The profile is fetched server-side by the (app)/layout.tsx Server
      // Component and synchronously seeded into Zustand by AuthInitializer before
      // the first render.  Re-fetching it here on every TOKEN_REFRESHED /
      // INITIAL_SESSION event caused:
      //   1. A null-window race: profile briefly became null while the fetch was
      //      in-flight, disabling all `enabled: !!profileId` queries.
      //   2. An infinite-loop risk: setProfile → re-render → new supabase ref
      //      → effect cleanup + re-subscribe (in the old non-ref code path).
    })

    return () => {
      subscription.unsubscribe()
      subscribedRef.current = false
    }
  // Empty deps: supabase is module-level (stable), router and setProfile are
  // stable refs from Next.js / Zustand respectively.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signInWithGoogle = async (nextPath = '/') => {
    const safeNextPath = nextPath.startsWith('/') ? nextPath : '/'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`,
      },
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
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
    try { await supabase.auth.signOut() } catch { /* ignore revocation errors */ }
  }

  return { signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }
}
