'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronLeft, Share2, Upload as UploadIcon } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Podium, LeaderboardRow } from '@/components/leaderboard/podium'
import { StepEntryCard } from '@/components/challenge/step-entry-card'
import { ActivityFeed } from '@/components/challenge/activity-feed'
import { JanuszMode } from '@/components/challenge/janusz-mode'
import { useChallengeLeaderboard, useStepEntries } from '@/hooks/use-leaderboard'
import { useRealtimeLeaderboard } from '@/hooks/use-realtime'
import { useAppStore } from '@/store/app-store'
import { generateDailyRoast } from '@/lib/trash-talk'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OCRUpload } from '@/components/upload/ocr-upload'
import { formatDate } from '@/lib/utils'
import type { Challenge, Profile } from '@/types/database'
import { toast } from 'sonner'
import { generateInviteUrl } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRef } from 'react'

interface ChallengeDetailClientProps {
  challenge: Challenge
  currentUserId: string
  profile: Profile | null
  memberCount: number
}

export function ChallengeDetailClient({ challenge, currentUserId, profile: profileProp, memberCount }: ChallengeDetailClientProps) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const { profile, setProfile } = useAppStore()
  const queryClient = useQueryClient()
  const supabaseRef = useRef(createClient())
  useEffect(() => { if (profileProp) setProfile(profileProp) }, [profileProp, setProfile])

  const { data: leaderboard, isLoading: lbLoading, isError: lbError, refetch: refetchLb } = useChallengeLeaderboard(challenge.id)
  const { data: entries, isLoading: entriesLoading } = useStepEntries(challenge.id)

  useRealtimeLeaderboard(challenge.id)

  const isEnded = new Date(challenge.end_date) < new Date()
  const isActive =
    new Date(challenge.start_date) <= new Date() && !isEnded

  const today = new Date().toISOString().split('T')[0]
  const hasSubmittedToday = entries?.some(
    (e) => e.user_id === currentUserId && e.entry_date === today
  )

  const roasts = leaderboard
    ? generateDailyRoast(
        leaderboard.map((e) => ({ username: e.username, stepCount: e.total_steps })),
        leaderboard.length
      )
    : []

  const { data: liveMemberCount } = useQuery({
    queryKey: ['challenge-member-count', challenge.id],
    initialData: memberCount,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseRef.current as any)
        .rpc('challenge_member_counts', { p_challenge_ids: [challenge.id] })
      if (error) throw error
      const count = Number((data as Array<{ member_count: number }> | null)?.[0]?.member_count ?? memberCount)
      return Number.isFinite(count) ? count : memberCount
    },
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`challenge:members:${challenge.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_members',
          filter: `challenge_id=eq.${challenge.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['challenge-member-count', challenge.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [challenge.id, queryClient])

  const handleShare = async () => {
    const url = generateInviteUrl(challenge.invite_code)
    if (navigator.share) {
      await navigator.share({
        title: `Dołącz do Wyzwania!"${challenge.name}"!`,
        text: `Rywalizuj ze mną na kroki w Dreptak!`,
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link skopiowany!')
    }
  }

  return (
    <div className="page-container space-y-0">
      {/* Header */}
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/challenges" className="p-2 rounded-xl bg-white/5">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">{challenge.icon}</span>
              <h1 className="font-black text-base truncate">{challenge.name}</h1>
              {challenge.janusz_mode && (
                <Badge variant="warning" className="text-[10px] shrink-0">👑</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(challenge.start_date)} – {formatDate(challenge.end_date)}
              {' · '}
              {liveMemberCount ?? memberCount} uczest.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status badge */}
      <div className="px-0 py-3">
        {hasSubmittedToday && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <p className="text-sm font-bold text-emerald-400">Kroki dodane na dziś!</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leaderboard">
        <TabsList className="w-full">
          <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
          <TabsTrigger value="feed">Aktywność</TabsTrigger>
          {challenge.janusz_mode && isEnded && (
            <TabsTrigger value="janusz">Janusz 👑</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          {lbLoading ? (
            <LoadingSkeleton />
          ) : lbError ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-3xl">⚠️</p>
              <p className="text-sm text-muted-foreground">Nie udało się załadować rankingu.</p>
              <Button variant="outline" size="sm" onClick={() => refetchLb()}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <>
              <Podium entries={leaderboard} />

              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.user_id}
                    entry={entry}
                    isCurrentUser={entry.user_id === currentUserId}
                    delay={i * 0.04}
                  />
                ))}
              </div>

              {/* Roasts section */}
              {roasts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-muted-foreground">🔥 Daily Roast</h3>
                  {roasts.slice(0, 3).map((roast, i) => (
                    <div
                      key={i}
                      className="bg-white/5 rounded-2xl p-3 text-xs text-muted-foreground italic"
                    >
                      {roast}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-3xl">👟</p>
              <p className="text-sm text-muted-foreground mt-2">
                Brak wpisów – bądź pierwszy!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed">
          <ActivityFeed challengeId={challenge.id} />
        </TabsContent>

        {challenge.janusz_mode && isEnded && leaderboard && (
          <TabsContent value="janusz">
            <JanuszMode
              challengeId={challenge.id}
              leaderboard={leaderboard}
              isEnded={isEnded}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj kroki 📸</DialogTitle>
          </DialogHeader>
          <OCRUpload
            onSuccess={() => setUploadOpen(false)}
            activeChallengeIds={[challenge.id]}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 mt-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
