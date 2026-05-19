'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import { setAppBadge, clearAppBadge } from '@/hooks/use-push-notifications'
import type { Notification } from '@/types/database'

// ─── Unread count ─────────────────────────────────────────────────────────────

export function useUnreadNotificationCount() {
  const supabase    = createClient()
  const profileId   = useAppStore(s => s.profile?.id)
  const setUnread   = useAppStore(s => s.setUnreadCount)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications-unread', profileId],
    enabled:  !!profileId,
    queryFn:  async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId!)
        .eq('read', false)
      return count ?? 0
    },
  })

  // Keep Zustand store + badge in sync
  useEffect(() => {
    const count = query.data ?? 0
    setUnread(count)
    if (count > 0) setAppBadge(count)
    else           clearAppBadge()
  }, [query.data, setUnread])

  // Realtime subscription
  useEffect(() => {
    if (!profileId) return

    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications-unread', profileId] })
          queryClient.invalidateQueries({ queryKey: ['notifications', profileId] })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId, supabase, queryClient])

  return query
}

// ─── Notification list ────────────────────────────────────────────────────────

export function useNotifications(limit = 50) {
  const supabase  = createClient()
  const profileId = useAppStore(s => s.profile?.id)

  return useQuery<Notification[]>({
    queryKey: ['notifications', profileId],
    enabled:  !!profileId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profileId!)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export function useMarkAllRead() {
  const supabase    = createClient()
  const profileId   = useAppStore(s => s.profile?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!profileId) return
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profileId)
        .eq('read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', profileId] })
      queryClient.invalidateQueries({ queryKey: ['notifications',         profileId] })
    },
  })
}
