'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import {
  requestAndRegister,
  isIos,
  isStandalone,
  isPushSupported,
  getPermissionStatus,
} from '@/hooks/use-push-notifications'
import { IosInstallHint } from './ios-install-hint'

export function PushPermissionSheet() {
  const { showPushPrompt, setShowPushPrompt, setPushPermissionAsked } = useAppStore()
  const [loading, setLoading]         = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)

  // Don't render on SSR
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted || !showPushPrompt) return null

  const ios = isIos()

  const handleEnable = async () => {
    if (ios && !isStandalone()) {
      // iOS requires PWA mode — show install hint instead
      setShowIosHint(true)
      return
    }

    if (!isPushSupported()) {
      dismiss()
      return
    }

    setLoading(true)
    try {
      const { status } = await requestAndRegister()
      if (status === 'granted' || status === 'denied') {
        dismiss()
      }
    } finally {
      setLoading(false)
    }
  }

  const dismiss = () => {
    setPushPermissionAsked(true)
    setShowPushPrompt(false)
  }

  if (showIosHint) {
    return (
      <IosInstallHint onClose={dismiss} />
    )
  }

  return (
    <AnimatePresence>
      {showPushPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb"
          >
            <div className="bg-[#0f0f17] border-t border-white/10 rounded-t-3xl px-5 pt-3 pb-8 mx-auto max-w-lg">
              {/* Drag handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                  <Bell className="w-7 h-7 text-white" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-black">
                    Nie przegap kiedy ktoś cię wyprzedzi 👀
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Włącz powiadomienia o podium, roastach i zmianach w rankingu.
                  </p>
                </div>

                {ios && !isStandalone() && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    Na iPhone powiadomienia działają po dodaniu aplikacji do ekranu głównego.
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Button
                    variant="gradient"
                    size="lg"
                    className="w-full"
                    onClick={handleEnable}
                    loading={loading}
                  >
                    {ios && !isStandalone() ? 'Jak to zrobić?' : 'Włącz powiadomienia 🔔'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full text-muted-foreground"
                    onClick={dismiss}
                  >
                    Później
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
