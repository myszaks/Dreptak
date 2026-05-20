'use client'

import { useState, useEffect } from 'react'
import { useJoinChallenge } from '@/hooks/use-challenges'
import { useAppStore } from '@/store/app-store'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Profile } from '@/types/database'

interface JoinClientProps {
  profile: Profile | null
  initialCode?: string
}

export function JoinClient({ profile, initialCode }: JoinClientProps) {
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? '')
  const [autoJoinDone, setAutoJoinDone] = useState(false)
  const joinChallenge = useJoinChallenge()
  const { setProfile, pushPermissionAsked, setShowPushPrompt } = useAppStore()
  const router = useRouter()

  useEffect(() => { if (profile) setProfile(profile) }, [profile, setProfile])

  const handleJoin = async (rawCode?: string) => {
    const normalizedCode = (rawCode ?? code).trim().toUpperCase()
    if (!normalizedCode) return

    try {
      const challenge = await joinChallenge.mutateAsync(normalizedCode)
      toast.success(`🎉 Dołączyłeś/aś do "${challenge.name}"!`)
      // Trigger notification permission prompt after first join
      if (!pushPermissionAsked) setShowPushPrompt(true)
      router.push(`/challenges/${challenge.slug ?? challenge.id}`)
    } catch (err: any) {
      toast.error(err?.message ?? 'Błędny kod zaproszenia')
    }
  }

  useEffect(() => {
    if (!initialCode || autoJoinDone || joinChallenge.isPending) return
    const normalizedCode = initialCode.trim().toUpperCase()
    if (normalizedCode.length < 6) return
    setCode(normalizedCode)
    setAutoJoinDone(true)
    void handleJoin(normalizedCode)
  }, [initialCode, autoJoinDone, joinChallenge.isPending])

  return (
    <div className="page-container space-y-5">
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/challenges" className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black">Dołącz do Wyzwania</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="text-center space-y-2">
              <p className="text-4xl">🔗</p>
              <p className="font-bold">Masz kod zaproszenia?</p>
              <p className="text-sm text-muted-foreground">
                Wpisz 8-znakowy kod od organizatora wyzwania
              </p>
            </div>

            <Input
              placeholder="np. ABC12345"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center text-lg font-mono tracking-widest uppercase h-14"
              maxLength={8}
            />

            <Button
              className="w-full"
              variant="gradient"
              size="lg"
              onClick={() => handleJoin()}
              loading={joinChallenge.isPending}
              disabled={code.length < 6}
            >
              Dołącz do wyzwania 🚀
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
