'use client'

import { motion } from 'framer-motion'
import { UserAvatar } from '@/components/ui/avatar'
import { formatSteps, getRankEmoji } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types/database'
import { cn } from '@/lib/utils'

interface PodiumProps {
  entries: LeaderboardEntry[]
}

const PODIUM_CONFIG = [
  { height: 'h-20', bg: 'from-yellow-500 to-amber-400', shadow: 'shadow-yellow-500/40', label: '🥇 Mistrz', order: 1 },
  { height: 'h-14', bg: 'from-slate-400 to-slate-300', shadow: 'shadow-slate-400/40', label: '🥈 Wicemistrz', order: 0 },
  { height: 'h-10', bg: 'from-amber-700 to-amber-600', shadow: 'shadow-amber-700/40', label: '🥉 Brązowy', order: 2 },
]

export function Podium({ entries }: PodiumProps) {
  const top3 = entries.slice(0, 3)
  // Reorder: 2nd, 1st, 3rd for visual podium layout
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)

  if (top3.length === 0) return null

  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-end justify-center gap-3">
        {podiumOrder.map((entry, visualIdx) => {
          const rank = entry.rank
          const config = PODIUM_CONFIG[rank - 1]
          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: visualIdx * 0.15, type: 'spring', stiffness: 200 }}
              className="flex flex-col items-center gap-2 flex-1"
            >
              {/* Avatar */}
              <div className="relative">
                <UserAvatar
                  username={entry.username}
                  avatarUrl={entry.avatar_url}
                  size={rank === 1 ? 'lg' : 'md'}
                  className={rank === 1 ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background' : ''}
                />
                {rank === 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👑</div>
                )}
              </div>

              {/* Name */}
              <div className="text-center">
                <p className="text-xs font-bold truncate max-w-[80px]">{entry.username}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatSteps(entry.total_steps)}
                </p>
              </div>

              {/* Podium block */}
              <div
                className={cn(
                  'w-full rounded-t-2xl flex items-center justify-center',
                  `bg-gradient-to-b ${config.bg}`,
                  config.height,
                  `shadow-lg ${config.shadow}`
                )}
              >
                <span className="text-white font-black text-xl">{getRankEmoji(rank)}</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  isCurrentUser?: boolean
  delay?: number
}

export function LeaderboardRow({ entry, isCurrentUser, delay = 0 }: LeaderboardRowProps) {
  const isTop3 = entry.rank <= 3
  const rankColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-slate-300',
    3: 'text-amber-600',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-2xl transition-colors',
        isCurrentUser
          ? 'bg-primary/10 border border-primary/30'
          : 'bg-white/5 hover:bg-white/8',
        isTop3 && 'border border-white/10'
      )}
    >
      {/* Rank */}
      <div className="w-8 text-center">
        <span className={cn('text-lg font-black', rankColors[entry.rank] ?? 'text-muted-foreground')}>
          {entry.rank <= 3 ? getRankEmoji(entry.rank) : `#${entry.rank}`}
        </span>
      </div>

      {/* Avatar */}
      <UserAvatar
        username={entry.username}
        avatarUrl={entry.avatar_url}
        size="sm"
      />

      {/* Name & stats */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold truncate', isCurrentUser && 'text-primary')}>
          {entry.username}
          {isCurrentUser && <span className="ml-1 text-xs text-primary/70">(Ty)</span>}
        </p>
        {entry.days_submitted !== undefined && (
          <p className="text-xs text-muted-foreground">{entry.days_submitted} dni aktywnych</p>
        )}
      </div>

      {/* Steps */}
      <div className="text-right">
        <p className="text-base font-black tabular-nums">
          {formatSteps(entry.total_steps)}
        </p>
        <p className="text-xs text-muted-foreground">kroków</p>
      </div>
    </motion.div>
  )
}
