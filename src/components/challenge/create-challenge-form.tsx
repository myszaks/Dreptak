'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useCreateChallenge } from '@/hooks/use-challenges'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Crown, Calendar, Globe, Lock, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'
import type { Profile } from '@/types/database'

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
}

export function CreateChallengeForm({ profile }: CreateChallengeFormProps) {
  const [selectedIcon, setSelectedIcon] = useState('🏃')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createChallenge = useCreateChallenge()
  const router = useRouter()
  const setProfile = useAppStore(s => s.setProfile)

  // Inicjalizuj profil w store z danych server-side
  useEffect(() => {
    if (profile) setProfile(profile)
  }, [profile, setProfile])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateChallengeFormData>({
    defaultValues: {
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0],
      is_public: false,
      janusz_mode: false,
    },
  })

  const isPublic = watch('is_public')
  const januszMode = watch('janusz_mode')

  const onSubmit = async (data: CreateChallengeFormData) => {
    setSubmitError(null)
    try {
      const challenge = await createChallenge.mutateAsync({
        ...data,
        icon: selectedIcon,
      })
      toast.success('🎉 Wyzwanie stworzone!')
      router.push(`/challenges/${challenge.slug ?? challenge.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się stworzyć wyzwania'
      setSubmitError(message)
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Icon picker */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">Ikona wyzwania</label>
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

      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">Nazwa wyzwania *</label>
        <Input
          placeholder="np. Tydzień z krokami"
          {...register('name', { required: 'Nazwa jest wymagana', minLength: 3 })}
        />
        {errors.name && (
          <p className="text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">Opis (opcjonalnie)</label>
        <Input placeholder="Krótki opis wyzwania..." {...register('description')} />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Start
          </label>
          <Input
            type="date"
            {...register('start_date', { required: true })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Koniec
          </label>
          <Input
            type="date"
            {...register('end_date', { required: true })}
          />
        </div>
      </div>

      {/* Privacy toggle (shadcn-style Switch) */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          {isPublic ? (
            <Globe className="w-5 h-5 text-blue-400" />
          ) : (
            <Lock className="w-5 h-5 text-violet-400" />
          )}
          <div>
            <p className="text-sm font-bold">{isPublic ? 'Publiczny' : 'Prywatny'}</p>
            <p className="text-xs text-muted-foreground">
              {isPublic ? 'Każdy może dołączyć' : 'Tylko z linkiem/kodem'}
            </p>
          </div>
        </div>
        <Switch checked={!!isPublic} onCheckedChange={(v) => setValue('is_public', v)} />
      </div>

      {/* Janusz mode */}
      <Card className={cn('overflow-hidden', januszMode && 'border-amber-500/30')}>
        {januszMode && <div className="h-1 bg-gradient-to-r from-amber-500 to-red-500" />}
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className={cn('w-5 h-5', januszMode ? 'text-amber-400' : 'text-muted-foreground')} />
              <div>
                <p className="text-sm font-bold">Janusz Mode 😈</p>
                <p className="text-xs text-muted-foreground">
                  Ostatnie miejsce dostaje karę
                </p>
              </div>
            </div>
            <Switch checked={!!januszMode} onCheckedChange={(v) => setValue('janusz_mode', v)} />
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
                className="text-sm"
              />
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        loading={createChallenge.isPending}
      >
        🚀 Stwórz Wyzwanie
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
