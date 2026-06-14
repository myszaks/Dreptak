'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useCreateChallenge, useUpdateChallenge } from '@/hooks/use-challenges'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Crown, Calendar, Globe, Lock, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { Profile, Challenge } from '@/types/database'

const CHALLENGE_ICONS = ['🏃', '💪', '🔥', '⚡', '🚀', '🏆', '🎯', '👟', '🌟', '🦁']

interface CreateChallengeFormData {
  name: string
  description?: string
  start_date: string
  end_date: string
  is_public: boolean
  janusz_mode: boolean
  janusz_penalty_text?: string
}

interface CreateChallengeFormProps {
  profile: Profile | null
  challenge?: Challenge | null
}

const todayISO = () => new Date().toISOString().split('T')[0]

const isNotPastDate = (value: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selected = new Date(value)
  selected.setHours(0, 0, 0, 0)

  return selected >= today || 'Data nie może być w przeszłości'
}

export function CreateChallengeForm({ profile, challenge }: CreateChallengeFormProps) {
  const [selectedIcon, setSelectedIcon] = useState(challenge?.icon ?? '🏃')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createChallenge = useCreateChallenge()
  const updateChallenge = useUpdateChallenge()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateChallengeFormData>({
    defaultValues: {
      name: challenge?.name ?? '',
      description: challenge?.description ?? '',
      start_date: challenge?.start_date ?? todayISO(),
      end_date: challenge?.end_date ?? new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0],
      is_public: challenge?.is_public ?? false,
      janusz_mode: challenge?.janusz_mode ?? false,
      janusz_penalty_text: challenge?.janusz_penalty_text ?? undefined,
    },
  })

  const isPublic = watch('is_public')
  const januszMode = watch('janusz_mode')
  const startDate = watch('start_date')

  const onSubmit = async (data: CreateChallengeFormData) => {
    setSubmitError(null)
    try {
      if (challenge) {
        await updateChallenge.mutateAsync({ id: challenge.id, input: { ...data, icon: selectedIcon } })
        toast.success('✅ Wyzwanie zaktualizowane!')
        router.push(`/challenges/${challenge.slug ?? challenge.id}`)
      } else {
        const created = await createChallenge.mutateAsync({
          ...data,
          icon: selectedIcon,
        })
        toast.success('🎉 Wyzwanie stworzone!')
        router.push(`/challenges/${created.slug ?? created.id}`)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Nie udało się stworzyć wyzwania'
      setSubmitError(message)
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ICONS */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">
          Ikona wyzwania
        </label>

        <div className="flex gap-2 flex-wrap">
          {CHALLENGE_ICONS.map((icon) => (
            <motion.button
              key={icon}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setSelectedIcon(icon)}
              className={cn(
                'w-11 h-11 rounded-2xl text-2xl flex items-center justify-center transition-all',
                selectedIcon === icon
                  ? 'bg-primary/20 border-2 border-primary scale-110'
                  : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
              )}
            >
              {icon}
            </motion.button>
          ))}
        </div>
      </div>

      {/* NAME */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">
          Nazwa wyzwania *
        </label>

        <Input
          placeholder="np. Tydzień z krokami"
          {...register('name', {
            required: 'Nazwa jest wymagana',
            minLength: { value: 3, message: 'Minimum 3 znaki' },
          })}
        />

        {errors.name && (
          <p className="text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* DESCRIPTION */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">
          Opis (opcjonalnie)
        </label>

        <Input
          placeholder="Krótki opis wyzwania..."
          {...register('description')}
        />
      </div>

      {/* DATES */}
      <div className="grid grid-cols-2 gap-3">

        {/* START */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Start *
          </label>

          <Input
            type="date"
            min={todayISO()}
            {...register('start_date', {
              required: 'Data startu jest wymagana',
              validate: isNotPastDate,
            })}
          />

          {errors.start_date && (
            <p className="text-xs text-red-400">
              {errors.start_date.message}
            </p>
          )}
        </div>

        {/* END */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Koniec *
          </label>

          <Input
            type="date"
            min={startDate || todayISO()}
            {...register('end_date', {
              required: 'Data końca jest wymagana',
              validate: (value) => {
                if (!startDate) return true

                const start = new Date(startDate)
                start.setHours(0, 0, 0, 0)

                const end = new Date(value)
                end.setHours(0, 0, 0, 0)

                return (
                  end >= start ||
                  'Data końca musi być późniejsza niż start'
                )
              },
            })}
          />

          {errors.end_date && (
            <p className="text-xs text-red-400">
              {errors.end_date.message}
            </p>
          )}
        </div>
      </div>

      {/* PUBLIC */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          {isPublic ? (
            <Globe className="w-5 h-5 text-blue-400" />
          ) : (
            <Lock className="w-5 h-5 text-violet-400" />
          )}

          <div>
            <p className="text-sm font-bold">
              {isPublic ? 'Publiczny' : 'Prywatny'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPublic ? 'Każdy może dołączyć' : 'Tylko z linkiem/kodem'}
            </p>
          </div>
        </div>

        <Switch
          checked={!!isPublic}
          onCheckedChange={(v) => setValue('is_public', v)}
        />
      </div>

      {/* JANUSZ MODE */}
      <Card className={cn('overflow-hidden', januszMode && 'border-amber-500/30')}>
        {januszMode && (
          <div className="h-1 bg-gradient-to-r from-amber-500 to-red-500" />
        )}

        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown
                className={cn(
                  'w-5 h-5',
                  januszMode ? 'text-amber-400' : 'text-muted-foreground'
                )}
              />

              <div>
                <p className="text-sm font-bold">Janusz Mode 😈</p>
                <p className="text-xs text-muted-foreground">
                  Ostatnie miejsce dostaje karę
                </p>
              </div>
            </div>

            <Switch
              checked={!!januszMode}
              onCheckedChange={(v) => setValue('janusz_mode', v)}
            />
          </div>

          {januszMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3"
            >
              <Input
                placeholder="np. Kupuje kebsa zwycięzcy 🥙"
                {...register('janusz_penalty_text')}
              />
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* SUBMIT */}
      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        loading={challenge ? updateChallenge.isPending : createChallenge.isPending}
      >
        {challenge ? '💾 Zapisz zmiany' : '🚀 Stwórz Wyzwanie'}
      </Button>

      {submitError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {submitError}
        </div>
      )}
    </form>
  )
}