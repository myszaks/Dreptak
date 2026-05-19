'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useUnreadNotificationCount } from '@/hooks/use-notifications'
import { useForegroundMessages, getPermissionStatus, registerPushToken } from '@/hooks/use-push-notifications'
import { useAppStore } from '@/store/app-store'

/**
 * Invisible provider mounted inside the authenticated app layout.
 * Responsibilities:
 * 1. Keeps unread notification count in sync (Zustand + badge)
 * 2. Re-registers push token on every mount if permission already granted
 * 3. Shows foreground push notifications as toasts
 */
export function NotificationsProvider() {
  const profile = useAppStore(s => s.profile)

  // Sync unread count (includes realtime subscription)
  useUnreadNotificationCount()

  // Show foreground messages as toasts
  useForegroundMessages((title, body) => {
    toast(title, {
      description: body,
      icon: '🔔',
      duration: 6000,
    })
  })

  // Re-register push token silently if permission was already granted
  useEffect(() => {
    if (!profile?.id) return
    if (getPermissionStatus() === 'granted') {
      registerPushToken().catch(() => {/* silent */})
    }
  }, [profile?.id])

  return null
}
