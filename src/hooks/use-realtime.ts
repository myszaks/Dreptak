'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeLeaderboard(challengeId: string) {
  const queryClient = useQueryClient()
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (!challengeId) return
    const supabase = supabaseRef.current

    const channel = supabase
      .channel(`leaderboard:${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'step_entries',
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] })
          queryClient.invalidateQueries({ queryKey: ['daily-leaderboard', challengeId] })
          queryClient.invalidateQueries({ queryKey: ['step-entries', challengeId] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['step-entries', challengeId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [challengeId, queryClient])
}

export function useRealtimeActivityFeed(challengeId: string, onNewItem: () => void) {
  const supabase = createClient()

  useEffect(() => {
    if (!challengeId) return

    const channel = supabase
      .channel(`feed:${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `challenge_id=eq.${challengeId}`,
        },
        onNewItem
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [challengeId, onNewItem, supabase])
}

export function useRealtimeNotifications(userId: string, onNew: () => void) {
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        onNew
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onNew, supabase])
}
