'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'

const STEP_EMOJIS = ['🏃', '💪', '🔥', '⚡', '🚀', '🌟', '🎯', '🦁', '🐺', '🦊']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('🏃')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setHasCompletedOnboarding } = useAppStore()
  const supabase = createClient()

  const handleFinish = async () => {
    if (!username.trim()) return
    setLoading(true)

    try {
      // Use the Supabase client only for the DB write. The user ID comes from
      // the Supabase session stored in the browser — getSession() is safe here
      // because this is a write path (not an auth gate); the middleware already
      // validated the session server-side before rendering this page.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          username: username.trim(),
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('Ta nazwa jest już zajęta! Wybierz inną.')
          setLoading(false)
          return
        }
        throw error
      }

      setHasCompletedOnboarding(true)
      router.push('/home')
    } catch (err) {
      toast.error('Coś poszło nie tak. Spróbuj ponownie.')
      setLoading(false)
    }
  }

  const steps = [
    {
      title: 'Witaj w Dreptak! 👟',
      subtitle: 'Zanim zaczniesz, powiedz nam jak się nazywasz',
      content: (
        <div className="space-y-4 w-full">
          <Input
            placeholder="Twoja nazwa w grze..."
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 20))}
            className="text-center text-lg font-bold h-14"
            maxLength={20}
            autoFocus
          />
          <p className="text-xs text-center text-muted-foreground">
            {username.length}/20 znaków
          </p>
        </div>
      ),
      canProceed: username.trim().length >= 2,
    },
    {
      title: 'Jak to działa? 🔥',
      subtitle: 'Zanim zaczniesz wyzwanie',
      content: (
        <div className="space-y-3 w-full">
          {[
            { icon: '📸', title: 'Zrób zdjęcie', desc: 'Screenshot z Apple Health / Google Fit' },
            { icon: '🤖', title: 'AI wyciąga kroki', desc: 'Automatycznie odczytujemy liczbę kroków' },
            { icon: '🏆', title: 'Walcz o podium', desc: 'Rywalizuj ze znajomymi o top 3' },
            { icon: '😈', title: 'Janusz Mode', desc: 'Ostatnie miejsce dostaje karę od grupy' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-bold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
      canProceed: true,
    },
  ]

  const currentStep = steps[step]

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-between p-6">
      {/* Progress */}
      <div className="w-full max-w-sm pt-8">
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black">{currentStep.title}</h2>
          <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
        </div>

        {currentStep.content}
      </motion.div>

      {/* CTA */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={step < steps.length - 1 ? () => setStep(step + 1) : handleFinish}
          disabled={!currentStep.canProceed}
          loading={loading}
        >
          {step < steps.length - 1 ? 'Dalej →' : 'Zacznij grać! 🚀'}
        </Button>

        {step > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep(step - 1)}>
            ← Wróć
          </Button>
        )}
      </div>
    </div>
  )
}
