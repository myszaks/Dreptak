'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, Search, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChallengeCard } from '@/components/challenge/challenge-card'
import type { Challenge, Profile } from '@/types/database'

interface Membership {
  role: string
  joined_at: string
  challenges: Challenge | null
}

interface ChallengesClientProps {
  memberships: Membership[]
  userId: string
  profile: Profile | null
  memberCounts: Record<string, number>
}

export function ChallengesClient({ memberships, userId, profile, memberCounts }: ChallengesClientProps) {
  const [search, setSearch] = useState('')

  const all = memberships
    .map((m) => m.challenges)
    .filter(Boolean) as Challenge[]

  const now = new Date()
  const active = all.filter(
    (c) => new Date(c.start_date) <= now && new Date(c.end_date) >= now
  )
  const upcoming = all.filter((c) => new Date(c.start_date) > now)
  const ended = all.filter((c) => new Date(c.end_date) < now)

  const filtered = (list: typeof all) =>
    list.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black">Wyzwania</h1>
          <div className="flex gap-2">
            <Link href="/challenges/join">
              <Button variant="outline" size="icon-sm">
                <QrCode className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/challenges/create">
              <Button variant="gradient" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Nowe Wyzwanie
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Aktywne {active.length > 0 && `(${active.length})`}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Nadchodzące {upcoming.length > 0 && `(${upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="ended">
            Zakończone {ended.length > 0 && `(${ended.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ChallengeList
            challenges={filtered(active)}
            memberCounts={memberCounts}
            emptyText="Brak aktywnych wyzwań 😴"
            emptyAction={
              <Link href="/challenges/create">
                <Button variant="gradient" size="sm">
                  + Stwórz pierwsze wyzwanie
                </Button>
              </Link>
            }
          />
        </TabsContent>

        <TabsContent value="upcoming">
          <ChallengeList
            challenges={filtered(upcoming)}
            memberCounts={memberCounts}
            emptyText="Brak nadchodzących wyzwań 😴"
          />
        </TabsContent>

        <TabsContent value="ended">
          <ChallengeList
            challenges={filtered(ended)}
            memberCounts={memberCounts}
            emptyText="Brak zakończonych wyzwań 😴"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ChallengeList({
  challenges,
  memberCounts,
  emptyText,
  emptyAction,
}: {
  challenges: Challenge[]
  memberCounts: Record<string, number>
  emptyText: string
  emptyAction?: React.ReactNode
}) {
  if (challenges.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-3xl">🏁</p>
        <p className="text-sm text-muted-foreground">{emptyText}</p>
        {emptyAction}
      </div>
    )
  }

  return (
    <div className="space-y-3 mt-1">
      {challenges.map((challenge, i) => (
        <motion.div
          key={challenge.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <ChallengeCard
            challenge={challenge}
            memberCount={memberCounts[challenge.id] ?? 0}
          />
        </motion.div>
      ))}
    </div>
  )
}
