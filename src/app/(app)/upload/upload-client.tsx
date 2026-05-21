'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Camera, Pencil, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/app-store'
import { useSubmitSteps } from '@/hooks/use-leaderboard'
import { useScreenshotAttempts, MAX_SCREENSHOT_ATTEMPTS } from '@/hooks/use-screenshot-attempts'
import { formatSteps } from '@/lib/utils'
import type { Challenge, Profile } from '@/types/database'
import { toast } from 'sonner'

const OCRUpload = dynamic(() => import('@/components/upload/ocr-upload').then(m => m.OCRUpload), {
  loading: () => <Skeleton className="h-48 w-full" />,
  ssr: false,
})

type Mode = 'screenshot' | 'manual'

interface TodayEntry {
  step_count: number
  edit_expires_at: string | null
}

interface UploadClientProps {
  activeChallenges: Challenge[]
  profile: Profile | null
  todayEntry: TodayEntry | null
}

export function UploadClient({ activeChallenges, profile, todayEntry }: UploadClientProps) {
  const pushPermissionAsked   = useAppStore(s => s.pushPermissionAsked)
  const setShowPushPrompt     = useAppStore(s => s.setShowPushPrompt)
  const router = useRouter()

  const canEdit = todayEntry != null &&
    todayEntry.edit_expires_at != null &&
    new Date(todayEntry.edit_expires_at) > new Date()

  // If entry exists but can still be edited, start in manual mode pre-filled
  const [mode, setMode] = useState<Mode>(() =>
    canEdit ? 'manual' : 'screenshot'
  )
  const [manualSteps, setManualSteps] = useState(() =>
    canEdit && todayEntry ? String(todayEntry.step_count) : ''
  )
  const submitSteps = useSubmitSteps()
  const { attempts, increment, hasReachedLimit, remaining } = useScreenshotAttempts()

  // If screenshot limit hit, force manual
  useEffect(() => {
    if (hasReachedLimit) setMode('manual')
  }, [hasReachedLimit])

  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const handleManualSubmit = async () => {
    const steps = parseInt(manualSteps, 10)
    if (isNaN(steps) || steps <= 0 || steps > 100000) {
      toast.error('Podaj prawidłową liczbę kroków (1 – 100 000)')
      return
    }
    try {
      await submitSteps.mutateAsync({
        stepCount: steps,
        entryDate: today,
        activeChallengeIds: activeChallenges.map(c => c.id),
      })
      const n = activeChallenges.length
      toast.success(`✅ Zapisano ${formatSteps(steps)} kroków w ${n} ${n === 1 ? 'wyzwaniu' : 'wyzwaniach'}!`)
      if (!pushPermissionAsked) setShowPushPrompt(true)
      router.push('/home')
    } catch (err: any) {
      toast.error(err?.message ?? 'Nie udało się zapisać kroków.')
    }
  }

  if (activeChallenges.length === 0) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-dvh gap-4">
        <p className="text-4xl">😴</p>
        <div className="text-center">
          <p className="font-black text-lg">Brak aktywnych wyzwań</p>
          <p className="text-sm text-muted-foreground">Dołącz do wyzwania, żeby dodawać kroki</p>
        </div>
        <Link href="/challenges/join">
          <Button variant="gradient">Dołącz do wyzwania</Button>
        </Link>
      </div>
    )
  }

  // Entry exists and edit window closed — show "done for today"
  if (todayEntry && !canEdit) {
    return (
      <div className="page-container space-y-5">
        <div className="sticky-header -mx-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-2 rounded-xl bg-white/5">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-black">Dodaj kroki</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[60dvh] gap-6 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="text-2xl font-black mb-1">
              {formatSteps(todayEntry.step_count)} kroków
            </p>
            <p className="text-muted-foreground text-sm">
              Twój wpis na {todayLabel} jest już zapisany.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Następny wpis możliwy jutro.
            </p>
          </div>
          <Link href="/home">
            <Button variant="gradient">Wróć do domu</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="page-container space-y-5">
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/home" className="p-2 rounded-xl bg-white/5">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black">
            {canEdit ? 'Edytuj kroki' : 'Dodaj kroki'}
          </h1>
        </div>
      </div>

      {/* Edit window notice */}
      {canEdit && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-400">Edytujesz dzisiejszy wpis</p>
              <p className="text-xs text-muted-foreground">
                Możesz zmienić wynik w ciągu 15 minut od pierwszego dodania.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Propagation info */}
      {!canEdit && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-3">
            <p className="text-xs font-bold text-blue-400 mb-1.5">
              👟 Wpis na {todayLabel} trafi do:
            </p>
            <div className="space-y-1">
              {activeChallenges.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode toggle — hide when editing (force manual) */}
      {!canEdit && (
        <div className="flex bg-white/5 rounded-2xl p-1">
          <button
            onClick={() => { if (!hasReachedLimit) setMode('screenshot') }}
            disabled={hasReachedLimit}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${
              mode === 'screenshot' && !hasReachedLimit
                ? 'bg-white/10 text-foreground'
                : hasReachedLimit
                ? 'text-muted-foreground/40 cursor-not-allowed'
                : 'text-muted-foreground'
            }`}
          >
            <Camera className="w-4 h-4" />
            Screenshot
            {hasReachedLimit && <span className="text-xs">(limit)</span>}
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${
              mode === 'manual' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Pencil className="w-4 h-4" />
            Ręcznie
          </button>
        </div>
      )}

      {/* Attempt counter / limit notice */}
      {!canEdit && hasReachedLimit ? (
        <p className="text-xs text-amber-400 text-center">
          Dzienny limit zdjęć wyczerpany ({MAX_SCREENSHOT_ATTEMPTS}/{MAX_SCREENSHOT_ATTEMPTS}). Jutro możesz znowu dodać screenshot.
        </p>
      ) : !canEdit && attempts > 0 ? (
        <p className="text-xs text-muted-foreground text-center">
          Pozostało {remaining} z {MAX_SCREENSHOT_ATTEMPTS} prób screenshotem
        </p>
      ) : null}

      <AnimatePresence mode="wait">
        {mode === 'screenshot' && !canEdit ? (
          <motion.div
            key="screenshot"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
          >
            <OCRUpload
              onSuccess={() => router.push('/home')}
              onAttempt={increment}
              activeChallengeIds={activeChallenges.map(c => c.id)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {canEdit ? 'Popraw liczbę kroków' : 'Liczba kroków dzisiaj'}
              </p>
              <Input
                type="number"
                inputMode="numeric"
                value={manualSteps}
                onChange={(e) => setManualSteps(e.target.value)}
                placeholder="np. 8 530"
                className="text-2xl font-black text-center h-16 tracking-widest"
                min={1}
                max={999999}
                autoFocus
              />
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleManualSubmit}
              disabled={submitSteps.isPending || !manualSteps || parseInt(manualSteps) <= 0}
            >
              {submitSteps.isPending
                ? 'Zapisywanie…'
                : canEdit
                ? 'Zaktualizuj kroki ✏️'
                : 'Zapisz kroki 🚀'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
