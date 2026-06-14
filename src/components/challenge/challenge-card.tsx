'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Calendar, Lock, Globe, Crown, Copy, Check, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, generateInviteUrl } from '@/lib/utils'
import type { Challenge } from '@/types/database'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ChallengeCardProps {
  challenge: Challenge
  memberCount?: number
  userRank?: number
  totalSteps?: number
  className?: string
}

export function ChallengeCard({
  challenge,
  memberCount = 0,
  userRank,
  totalSteps,
  className,
}: ChallengeCardProps) {
  const [copied, setCopied] = useState(false)

  const isActive =
    new Date(challenge.start_date) <= new Date() &&
    new Date(challenge.end_date) >= new Date()
  const isEnded = new Date(challenge.end_date) < new Date()
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(challenge.end_date).getTime() - Date.now()) / 86_400_000
    )
  )

  const handleCopyInvite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await navigator.clipboard.writeText(generateInviteUrl(challenge.invite_code))
    setCopied(true)
    toast.success('Link skopiowany!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link href={`/challenges/${challenge.slug ?? challenge.id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn('block', className)}
      >
        <Card className="overflow-hidden">
          {/* Gradient header */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600" />

          <CardContent className="p-4 space-y-3">
            {/* Title row */}
            <div className="flex items-start gap-3">
              <div className="text-3xl">{challenge.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base truncate">{challenge.name}</h3>
                  {challenge.janusz_mode && (
                    <Badge variant="warning" className="text-[10px]">
                      <Crown className="w-3 h-3 mr-1" />
                      Janusz
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(challenge.start_date)} – {formatDate(challenge.end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    {challenge.is_public ? (
                      <Globe className="w-3 h-3" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    {challenge.is_public ? 'Publiczny' : 'Prywatny'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{memberCount} uczest.</span>
              </div>

              {userRank && (
                <Badge variant="secondary" className="text-xs">
                  #{userRank} miejsce
                </Badge>
              )}

              <div className="flex-1" />

              {isActive && (
                <Badge variant="success" className="text-xs">
                  {daysLeft}d zostało
                </Badge>
              )}
              {isEnded && (
                <Badge variant="outline" className="text-xs">
                  Zakończony
                </Badge>
              )}
              {!isActive && !isEnded && (
                <Badge variant="secondary" className="text-xs">
                  Nadchodzący
                </Badge>
              )}
            </div>

            {/* Invite code */}
            {!isEnded && (
            <button
              onClick={handleCopyInvite}
              className="w-full flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <span className="text-xs text-muted-foreground">
                Kod zaproszenia:{' '}
                <span className="font-mono font-bold text-foreground">
                  {challenge.invite_code}
                </span>
              </span>
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}
