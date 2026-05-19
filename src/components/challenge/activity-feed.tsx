'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { UserAvatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { getRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtimeActivityFeed } from '@/hooks/use-realtime'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { formatSteps } from '@/lib/utils'
import type { Json } from '@/types/database'

const FEED_TYPE_CONFIG: Record<string, { emoji: string; template: (meta: Record<string, unknown>, actor: string, target?: string) => string }> = {
  step_entry: {
    emoji: '👟',
    template: (meta, actor) =>
      `${actor} dodał/a ${formatSteps(Number(meta.step_count ?? 0))} kroków`,
  },
  reaction: {
    emoji: '😄',
    template: (meta, actor) => `${actor} zareagował/a ${meta.emoji ?? ''}`,
  },
  member_joined: {
    emoji: '🎉',
    template: (_, actor) => `${actor} dołączył/a do wyzwania`,
  },
  leaderboard_change: {
    emoji: '📈',
    template: (_, actor) => `${actor} awansował/a w rankingu`,
  },
  roast: {
    emoji: '🔥',
    template: (meta) => String(meta.message ?? 'Ktoś dostał roast!'),
  },
  achievement: {
    emoji: '🏅',
    template: (meta, actor) => `${actor} zdobył/a odznakę: ${meta.achievement ?? ''}`,
  },
  challenge_started: {
    emoji: '🚀',
    template: () => 'Wyzwanie wystartowało!',
  },
  challenge_ended: {
    emoji: '🏁',
    template: () => 'Wyzwanie zakończone!',
  },
}

interface ActivityFeedProps {
  challengeId: string
}

export function ActivityFeed({ challengeId }: ActivityFeedProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const handleNewItem = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activity-feed', challengeId] })
  }, [challengeId, queryClient])

  useRealtimeActivityFeed(challengeId, handleNewItem)

  const { data: feedItems, isLoading } = useQuery({
    queryKey: ['activity-feed', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          *,
          actor:profiles!actor_id (username, avatar_url),
          target:profiles!target_user_id (username, avatar_url)
        `)
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as any[]
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <Skeleton className="w-9 h-9 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!feedItems?.length) {
    return (
      <div className="text-center py-10">
        <p className="text-3xl">😴</p>
        <p className="text-sm text-muted-foreground mt-2">Jeszcze nic się nie dzieje...</p>
        <p className="text-xs text-muted-foreground">Dodaj pierwsze kroki!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item, i) => {
        const config = FEED_TYPE_CONFIG[item.type]
        if (!config) return null

        const actorProfile = item.actor as { username: string; avatar_url: string | null } | null
        const actorName = actorProfile?.username ?? 'Ktoś'
        const meta = (item.metadata as Record<string, unknown>) ?? {}
        const message = config.template(meta, actorName)

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3"
          >
            <div className="relative shrink-0">
              {actorProfile ? (
                <UserAvatar
                  username={actorProfile.username}
                  avatarUrl={actorProfile.avatar_url}
                  size="xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-sm">
                  {config.emoji}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 text-xs leading-none">
                {config.emoji}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getRelativeTime(item.created_at)}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
