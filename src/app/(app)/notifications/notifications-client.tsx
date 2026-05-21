'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { getRelativeTime } from '@/lib/utils'
import { useNotifications, useMarkAllRead } from '@/hooks/use-notifications'
import type { Notification, Profile } from '@/types/database'
import { cn } from '@/lib/utils'

const NOTIFICATION_ICONS: Record<string, string> = {
  leaderboard_overtake:  '📉',
  podium_change:         '🎯',
  challenge_invite:      '📨',
  daily_reminder:        '⏰',
  challenge_ending:      '⏳',
  achievement_unlocked:  '🏅',
  reaction_received:     '😄',
  challenge_started:     '🚀',
  challenge_ended:       '🏁',
  janusz_mode:           '😈',
  // legacy keys kept for backward compat
  overtaken:             '📉',
  podium_close:          '🎯',
}

interface NotificationsClientProps {
  notifications: Notification[]   // initial SSR data
  profile: Profile | null
}

export function NotificationsClient({ notifications: initial, profile }: NotificationsClientProps) {
  // Realtime list — falls back to SSR data while loading
  const { data: realtimeNotifs } = useNotifications(50)
  const notifications = realtimeNotifs ?? initial

  // Mark all read on mount
  const markRead = useMarkAllRead()
  useEffect(() => { markRead.mutate() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-container space-y-5">
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-black">Powiadomienia</h1>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-5xl">🔔</p>
          <div className="text-center">
            <p className="font-bold">Nic tutaj nie ma</p>
            <p className="text-sm text-muted-foreground">Powiadomienia pojawią się tutaj</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const inner = (
              <Card className={cn(!notif.read && 'border-primary/20 bg-primary/5')}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0">
                    {NOTIFICATION_ICONS[notif.type] ?? '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {getRelativeTime(notif.created_at)}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  )}
                </CardContent>
              </Card>
            )

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {notif.deep_link ? (
                  <Link href={notif.deep_link}>{inner}</Link>
                ) : inner}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
