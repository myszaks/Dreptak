'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isIos, isStandalone } from '@/hooks/use-push-notifications'
import { useAppStore } from '@/store/app-store'
import { IosInstallHint } from '@/components/notifications/ios-install-hint'

export function PwaInstallSheet() {
  const lastPwaPromptTime = useAppStore(s => s.lastPwaPromptTime)
  const setLastPwaPromptTime = useAppStore(s => s.setLastPwaPromptTime)
  
  const [mounted, setMounted] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null)
  const [visible, setVisible] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (e: Event) => {
      try { e.preventDefault() } catch {}
      setDeferredPrompt(e as any)
      
      // Show if never prompted or if 7 days have passed
      const now = Date.now()
      const PROMPT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
      const shouldShow = !lastPwaPromptTime || (now - lastPwaPromptTime) > PROMPT_INTERVAL_MS
      
      if (shouldShow && !isStandalone()) {
        setVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [lastPwaPromptTime])

  if (!mounted || !visible) return null

  const dismiss = () => {
    setVisible(false)
    setLastPwaPromptTime(Date.now())
  }

  const handleInstall = async () => {
    if (isIos() && !isStandalone()) {
      setShowIosHint(true)
      return
    }

    if (!deferredPrompt) {
      dismiss()
      return
    }

    try {
      await deferredPrompt.prompt()
      if (deferredPrompt.userChoice) await deferredPrompt.userChoice
    } catch (e) {
      // ignore
    } finally {
      dismiss()
      setDeferredPrompt(null)
    }
  }

  if (showIosHint) return <IosInstallHint onClose={dismiss} />

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
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
                onClick={dismiss}
                className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-black">Zainstaluj aplikację</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dodaj Dreptak do ekranu głównego, aby korzystać szybciej i otrzymywać powiadomienia.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="gradient" size="lg" className="w-full" onClick={handleInstall}>
                    Zainstaluj aplikację
                  </Button>
                  <Button variant="ghost" size="lg" className="w-full text-muted-foreground" onClick={dismiss}>
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
