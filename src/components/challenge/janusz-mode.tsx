'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, ThumbsUp, Trophy, Skull } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import { getThreePunishments } from '@/lib/trash-talk'
import type { LeaderboardEntry } from '@/types/database'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatSteps } from '@/lib/utils'

interface JanuszModeProps {
  challengeId: string
  leaderboard: LeaderboardEntry[]
  isEnded: boolean
}

export function JanuszMode({ challengeId, leaderboard, isEnded }: JanuszModeProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { profile } = useAppStore()
  const [punishments] = useState(() => getThreePunishments())

  const loser = leaderboard[leaderboard.length - 1]
  const winner = leaderboard[0]

  // Fetch available punishments from DB
  const { data: dbPunishments } = useQuery({
    queryKey: ['punishments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('janusz_punishments')
        .select('*')
        .eq('is_active', true)
        .limit(10)
      return data ?? []
    },
  })

  // Fetch current votes
  const { data: votes } = useQuery({
    queryKey: ['punishment-votes', challengeId],
    enabled: isEnded,
    queryFn: async () => {
      const { data } = await supabase
        .from('challenge_punishment_votes')
        .select(`
          punishment_id,
          voter_id,
          janusz_punishments (text)
        `)
        .eq('challenge_id', challengeId)
      return data ?? []
    },
  })

  const voteMutation = useMutation({
    mutationFn: async (punishmentId: string) => {
      const { error } = await supabase
        .from('challenge_punishment_votes')
        .insert({
          challenge_id: challengeId,
          punishment_id: punishmentId,
          voter_id: profile!.id,
        })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punishment-votes', challengeId] })
      toast.success('Głos oddany! 😈')
    },
    onError: () => {
      toast.error('Już głosowałeś/aś!')
    },
  })

  const hasVoted = votes?.some((v) => v.voter_id === profile?.id)

  // Count votes per punishment
  const voteCounts: Record<string, number> = {}
  votes?.forEach((v) => {
    voteCounts[v.punishment_id] = (voteCounts[v.punishment_id] ?? 0) + 1
  })

  const topPunishment = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]

  if (!loser || !isEnded) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      {/* Janusz banner */}
      <Card className="overflow-hidden border-amber-500/40">
        <div className="h-1 bg-gradient-to-r from-amber-500 to-red-500" />
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-xl">
              👑
            </div>
            <div>
              <h3 className="font-black text-base">JANUSZ MODE</h3>
              <p className="text-xs text-amber-400">Wyzwanie zakończone!</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Winner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
              <Trophy className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Zwycięzca</p>
              <UserAvatar
                username={winner?.username ?? '?'}
                avatarUrl={winner?.avatar_url}
                size="sm"
                className="mx-auto my-1"
              />
              <p className="text-sm font-bold truncate">{winner?.username}</p>
              <p className="text-xs text-emerald-400">{formatSteps(winner?.total_steps ?? 0)}</p>
            </div>

            {/* Loser */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-center">
              <Skull className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Janusz 😅</p>
              <UserAvatar
                username={loser.username}
                avatarUrl={loser.avatar_url}
                size="sm"
                className="mx-auto my-1"
              />
              <p className="text-sm font-bold truncate">{loser.username}</p>
              <p className="text-xs text-red-400">{formatSteps(loser.total_steps)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Punishment voting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>🗳️</span> Głosuj na karę
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(dbPunishments?.slice(0, 3) ?? punishments.map((text) => ({ id: text, text }))).map(
            (punishment) => {
              const punId = typeof punishment === 'string' ? punishment : punishment.id
              const punText = typeof punishment === 'string' ? punishment : punishment.text
              const count = voteCounts[punId] ?? 0
              const isLeading = topPunishment?.[0] === punId

              return (
                <motion.button
                  key={punId}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => !hasVoted && voteMutation.mutate(punId)}
                  disabled={hasVoted || voteMutation.isPending}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all',
                    isLeading && isEnded
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-white/5 border-white/10',
                    !hasVoted && 'hover:bg-white/10 cursor-pointer',
                    hasVoted && 'cursor-default'
                  )}
                >
                  <span className="text-sm font-medium flex-1">{punText}</span>
                  {count > 0 && (
                    <span className="text-xs font-bold text-amber-400 ml-2">
                      {count} głos{count === 1 ? '' : 'ów'}
                    </span>
                  )}
                </motion.button>
              )
            }
          )}

          {hasVoted && (
            <p className="text-xs text-center text-muted-foreground pt-2">
              ✅ Już oddałeś/aś głos
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
