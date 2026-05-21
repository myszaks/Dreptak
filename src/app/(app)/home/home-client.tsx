'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, Zap, Flame, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatSteps, formatDate } from '@/lib/utils'
import type { Profile, Challenge } from '@/types/database'

import { useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface TodayEntry {
  step_count: number
  edit_expires_at: string | null
}

interface HomeClientProps {
  profile: Profile | null
  activeChallenges: Challenge[]
  memberCounts: Record<string, number>
  todayEntry: TodayEntry | null
}

export function HomeClient({ profile, activeChallenges, memberCounts, todayEntry }: HomeClientProps) {
  const queryClient = useQueryClient()
  const supabaseRef = useRef(createClient())

  const challengeIds = useMemo(
    () => activeChallenges.map((c) => c.id).filter(Boolean),
    [activeChallenges]
  )

  const { data: liveMemberCounts } = useQuery({
    queryKey: ['home-member-counts', challengeIds],
    enabled: challengeIds.length > 0,
    initialData: memberCounts,
    // Mark the server-fetched data as fresh so React Query does not fire an
    // immediate background refetch on mount.  Without this, initialData is
    // treated as stale-at-zero and triggers a redundant network call.
    initialDataUpdatedAt: Date.now(),
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = supabaseRef.current as any
      const { data, error } = await supabase.rpc('challenge_member_counts', { p_challenge_ids: challengeIds })
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of (data ?? []) as Array<{ challenge_id: string; member_count: number }>) {
        counts[row.challenge_id] = Number(row.member_count)
      }
      return counts
    },
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (challengeIds.length === 0) return
    const watched = new Set(challengeIds)
    const supabase = supabaseRef.current
    const channel = supabase
      .channel('home:member-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenge_members' },
        (payload) => {
          const challengeId = (payload.new as { challenge_id?: string } | null)?.challenge_id
            ?? (payload.old as { challenge_id?: string } | null)?.challenge_id
          if (challengeId && watched.has(challengeId)) {
            queryClient.invalidateQueries({ queryKey: ['home-member-counts'] })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [challengeIds, queryClient])

  const today = new Date()
  const hour = today.getHours()
  const greeting =
    hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Hej' : 'Dobry wieczór'

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">
              {greeting},{' '}
              <span className="gradient-text">
                {profile?.username?.split(' ')[0] ?? 'Sportowiec'}!
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {today.toLocaleDateString('pl-PL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          {profile && (
            <Link href="/profile">
              <UserAvatar
                username={profile.username}
                avatarUrl={profile.avatar_url}
                size="md"
              />
            </Link>
          )}
        </div>
      </div>

      {/* Stats strip */}
      {profile && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
            label="Streak"
            value={`${profile.streak}🔥`}
            gradient="from-yellow-500/20 to-orange-500/20"
          />
          <StatCard
            icon={<Flame className="w-4 h-4 text-blue-400" />}
            label="Łącznie"
            value={formatSteps(profile.total_steps)}
            gradient="from-blue-500/20 to-violet-500/20"
          />
          <StatCard
            icon={<Calendar className="w-4 h-4 text-emerald-400" />}
            label="Wyzwania"
            value={`${activeChallenges.length}`}
            gradient="from-emerald-500/20 to-teal-500/20"
          />
        </div>
      )}

      {/* Quick upload CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {todayEntry ? (
          <Link href="/upload">
            <Card className="overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-2xl shrink-0">
                  ✅
                </div>
                <div className="flex-1">
                  <p className="font-black">Kroki dodane!</p>
                  <p className="text-sm text-muted-foreground">{formatSteps(todayEntry.step_count)} kroków dzisiaj</p>
                </div>
                {todayEntry.edit_expires_at && new Date(todayEntry.edit_expires_at) > new Date() && (
                  <div className="text-xs text-muted-foreground text-right">
                    <p>Edytuj</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/upload">
            <Card className="overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-violet-600" />
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-2xl shrink-0">
                  📸
                </div>
                <div className="flex-1">
                  <p className="font-black">Dodaj dzisiejsze kroki</p>
                  <p className="text-sm text-muted-foreground">Wrzuć screenshot z apki</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </motion.div>

      {/* Active challenges */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black">Twoje wyzwania</h2>
          <Link href="/challenges">
            <Button variant="ghost" size="sm" className="text-xs text-primary">
              Wszystkie →
            </Button>
          </Link>
        </div>

        {activeChallenges.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {activeChallenges.slice(0, 4).map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
              >
                <Link href={`/challenges/${challenge.slug ?? challenge.id}`}>
                  <Card className="overflow-hidden hover:bg-white/8 transition-colors">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="text-2xl">{challenge.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{challenge.name}</p>
                        <p className="text-xs text-muted-foreground">
                          do {formatDate(challenge.end_date)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {liveMemberCounts?.[challenge.id] ?? memberCounts[challenge.id] ?? 0} os.
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode
  label: string
  value: string
  gradient: string
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-3 border border-white/10`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-base font-black tabular-nums">{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 text-center space-y-3">
        <p className="text-4xl">🏃</p>
        <div>
          <p className="font-bold">Brak aktywnych wyzwań</p>
          <p className="text-sm text-muted-foreground">
            Stwórz wyzwanie lub dołącz do istniejącego!
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Link href="/challenges/create">
            <Button variant="gradient" size="sm">
              + Stwórz
            </Button>
          </Link>
          <Link href="/challenges/join">
            <Button variant="outline" size="sm">
              Dołącz
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
