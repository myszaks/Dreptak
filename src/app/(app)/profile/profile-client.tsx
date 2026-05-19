'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, LogOut, Edit3, Trophy, Flame, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { useAppStore } from '@/store/app-store'
import { formatSteps } from '@/lib/utils'
import type { Profile, Achievement } from '@/types/database'
import Link from 'next/link'

interface UserAchievement {
  created_at: string
  achievements: Achievement
}

interface ProfileClientProps {
  profile: Profile | null
  achievements: UserAchievement[]
  totalChallenges: number
}

export function ProfileClient({ profile, achievements, totalChallenges }: ProfileClientProps) {
  const { signOut } = useAuth()
  const { setProfile } = useAppStore()
  useEffect(() => { if (profile) setProfile(profile) }, [profile, setProfile])

  const handleSignOut = () => {
    // Session is cleared from cookies synchronously inside signOut();
    // token revocation is async - fire and forget so navigation is instant.
    signOut().catch(() => {})
    window.location.assign('/auth')
  }

  if (!profile) {
    return (
      <div className="page-container flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie profilu...</p>
      </div>
    )
  }

  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black">Profil</h1>
          <Link href="/settings">
            <Button variant="ghost" size="icon-sm">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-blue-500 via-violet-600 to-purple-600" />
          <CardContent className="p-4">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="relative">
                <UserAvatar
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  size="xl"
                  className="border-4 border-card ring-2 ring-white/10"
                />
              </div>
              <div className="flex-1 pb-1">
                <h2 className="text-lg font-black">{profile.username}</h2>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground mt-0.5">{profile.bio}</p>
                )}
              </div>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Edytuj
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatMini
                icon="👟"
                value={formatSteps(profile.total_steps)}
                label="Łącznie"
              />
              <StatMini
                icon="🔥"
                value={`${profile.streak}`}
                label="Streak"
              />
              <StatMini
                icon="🏆"
                value={`${totalChallenges}`}
                label="Wyzwań"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievements */}
      <section>
        <h2 className="text-base font-black mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          Odznaki
          <Badge variant="secondary" className="text-xs">{achievements.length}</Badge>
        </h2>

        {achievements.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl">🥚</p>
              <p className="text-sm text-muted-foreground mt-1">Brak odznak – czas to zmienić!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {achievements.map(({ achievements: ach, created_at }, i) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center text-xl">
                      {ach.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{ach.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{ach.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 hover:bg-red-500/20 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-bold">Wyloguj się</span>
      </button>
    </div>
  )
}

function StatMini({
  icon,
  value,
  label,
}: {
  icon: string
  value: string
  label: string
}) {
  return (
    <div className="text-center p-2 bg-white/5 rounded-2xl">
      <p className="text-base">{icon}</p>
      <p className="text-base font-black tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
