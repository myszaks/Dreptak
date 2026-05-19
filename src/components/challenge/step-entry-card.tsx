'use client'

import { motion } from 'framer-motion'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatSteps, getRelativeTime, getRankEmoji } from '@/lib/utils'
import { useToggleReaction } from '@/hooks/use-leaderboard'
import { useAppStore } from '@/store/app-store'
import { REACTION_EMOJIS, type StepEntryWithReactions, type ReactionEmoji } from '@/types/database'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface StepEntryCardProps {
  entry: StepEntryWithReactions & {
    profile: { username: string; avatar_url: string | null }
    reactions: Array<{ emoji: string; user_id: string }>
  }
  challengeId: string
  rank?: number
  trashTalk?: string
}

export function StepEntryCard({ entry, challengeId, rank, trashTalk }: StepEntryCardProps) {
  const { profile } = useAppStore()
  const toggleReaction = useToggleReaction()
  const isOwn = profile?.id === entry.user_id

  // Group reactions by emoji
  const reactionCounts = REACTION_EMOJIS.reduce<Record<string, { count: number; hasOwn: boolean }>>(
    (acc, emoji) => {
      acc[emoji] = {
        count: entry.reactions.filter((r: any) => r.emoji === emoji).length,
        hasOwn: entry.reactions.some((r: any) => r.emoji === emoji && r.user_id === profile?.id),
      }
      return acc
    },
    {} as Record<string, { count: number; hasOwn: boolean }>
  )

  const handleReact = async (emoji: ReactionEmoji) => {
    if (!profile) return
    try {
      await toggleReaction.mutateAsync({ entryId: entry.id, emoji, challengeId })
    } catch {
      toast.error('Nie udało się dodać reakcji')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white/5 border border-white/10 rounded-3xl p-4 space-y-3',
        isOwn && 'border-primary/30 bg-primary/5'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <UserAvatar
            username={entry.profile.username}
            avatarUrl={entry.profile.avatar_url}
            size="md"
          />
          {rank && rank <= 3 && (
            <div className="absolute -top-1 -right-1 text-sm">{getRankEmoji(rank)}</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm truncate">{entry.profile.username}</span>
            {isOwn && <Badge variant="outline" className="text-[10px] py-0">ty</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(entry.created_at)}
          </span>
        </div>

        <div className="text-right">
          <p className="text-xl font-black tabular-nums">
            {formatSteps(entry.step_count)}
          </p>
          <p className="text-xs text-muted-foreground">kroków</p>
        </div>
      </div>

      {/* Screenshot thumbnail */}
      {entry.screenshot_url && (
        <div className="w-full h-24 rounded-2xl overflow-hidden">
          <img
            src={entry.screenshot_url}
            alt="Screenshot kroków"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Trash talk */}
      {trashTalk && (
        <div className="bg-white/5 rounded-2xl px-3 py-2 text-xs text-muted-foreground italic">
          💬 {trashTalk}
        </div>
      )}

      {/* Reactions */}
      <div className="flex gap-2 flex-wrap">
        {REACTION_EMOJIS.map((emoji) => {
          const r = reactionCounts[emoji]
          return (
            <motion.button
              key={emoji}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleReact(emoji)}
              disabled={isOwn}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-xl text-sm font-semibold transition-all',
                r.hasOwn
                  ? 'bg-primary/20 border border-primary/40 text-primary'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10',
                isOwn && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span>{emoji}</span>
              {r.count > 0 && (
                <span className="text-xs tabular-nums">{r.count}</span>
              )}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
