'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface IosInstallHintProps {
  onClose: () => void
}

const STEPS = [
  {
    icon: Smartphone,
    label: 'Otwórz w Safari',
    description: 'Ta aplikacja musi być otwarta w przeglądarce Safari na iPhone.',
  },
  {
    icon: Share,
    label: 'Kliknij przycisk Udostępnij',
    description: 'Znajdź ikonę Share (kwadrat ze strzałką) na dole ekranu.',
  },
  {
    icon: PlusSquare,
    label: 'Dodaj do ekranu głównego',
    description: 'Wybierz „Dodaj do ekranu głównego" i zatwierdź.',
  },
]

export function IosInstallHint({ onClose }: IosInstallHintProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb"
      >
        <div className="bg-[#0f0f17] border-t border-white/10 rounded-t-3xl px-5 pt-3 pb-8 mx-auto max-w-lg">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-black">Jak włączyć powiadomienia na iPhone 🍎</h2>
              <p className="text-sm text-muted-foreground">
                iOS wymaga dodania aplikacji do ekranu głównego, żeby powiadomienia działały.
              </p>
            </div>

            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">
                        <span className="text-primary mr-1.5">{i + 1}.</span>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={onClose}
            >
              Rozumiem, zrobię to!
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
