'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useAppStore } from '@/store/app-store'
import type { Profile } from '@/types/database'

interface AuthInitializerProps {
  profile: Profile | null
}

/**
 * Synchronously seeds the Zustand store with the server-side profile BEFORE
 * the first paint.  Using useState's lazy-initializer (runs during render, not
 * after) means NotificationsProvider and every hook that reads `profile?.id`
 * already have a non-null profileId on their very first render cycle.
 *
 * Without this, those hooks would see profile=null until a useEffect fires
 * (post-paint), keeping `enabled: !!profileId` queries disabled for an entire
 * render cycle — the primary cause of the intermittent loading failures.
 *
 * The useEffect below handles subsequent navigations where the layout
 * re-fetches and passes a fresh profile (e.g. after the user updates settings).
 */
export function AuthInitializer({ profile }: AuthInitializerProps) {
  const setProfile = useAppStore(s => s.setProfile)

  // Runs synchronously during render — before any child/sibling renders.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useState(() => {
    if (profile) useAppStore.setState({ profile })
  })

  // Keep Zustand in sync when the layout RSC re-fetches on navigation.
  useEffect(() => {
    if (profile) setProfile(profile)
  }, [profile, setProfile])

  // Attach the auth state listener (sign-out detection, token refresh guard).
  useAuth()

  return null
}
