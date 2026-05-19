'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import imageCompression from 'browser-image-compression'
import { Upload, Camera, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatSteps } from '@/lib/utils'
import { useSubmitSteps } from '@/hooks/use-leaderboard'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type UploadStep = 'upload' | 'processing' | 'confirm' | 'done'

interface OCRUploadProps {
  onSuccess?: () => void
  onAttempt?: () => void
  activeChallengeIds?: string[]
}

export function OCRUpload({ onSuccess, onAttempt, activeChallengeIds }: OCRUploadProps) {
  const [step, setStep] = useState<UploadStep>('upload')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [detectedSteps, setDetectedSteps] = useState<number | null>(null)
  const [manualSteps, setManualSteps] = useState<string>('')
  const [confidence, setConfidence] = useState<number>(0)
  const [ocrRawText, setOcrRawText] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)

  const { profile } = useAppStore()
  const supabase = createClient()
  const submitSteps = useSubmitSteps()

  const processImage = useCallback(async (file: File) => {
    onAttempt?.()
    setStep('processing')
    setProgress(10)

    try {
      // Compress image
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })
      setProgress(30)

      // Create preview
      const previewUrl = URL.createObjectURL(compressed)
      setImagePreview(previewUrl)
      setProgress(50)

      // Call Gemini Vision API
      const formData = new FormData()
      formData.append('image', compressed, 'screenshot.jpg')
      setProgress(60)

      const res = await fetch('/api/ocr', { method: 'POST', body: formData })
      const json = await res.json() as { steps?: number | null; error?: string; message?: string }
      setProgress(90)

      if (res.status === 429) {
        toast.error(json.message ?? 'Limit API Gemini wyczerpany — wpisz kroki ręcznie')
      }

      const detectedCount = json.steps ?? null
      console.log('[Gemini OCR] steps:', detectedCount)

      setDetectedSteps(detectedCount)
      setConfidence(detectedCount !== null ? 0.95 : 0)
      setOcrRawText(detectedCount !== null ? String(detectedCount) : '')
      if (detectedCount !== null) {
        setManualSteps(detectedCount.toString())
      }

      // Upload screenshot to Supabase Storage (best-effort, 8s timeout)
      if (profile) {
        try {
          const ext = compressed.type.split('/')[1] || 'jpg'
          const path = `screenshots/${profile.id}/${Date.now()}.${ext}`
          const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
          const result = await Promise.race([
            supabase.storage.from('screenshots').upload(path, compressed, { upsert: false }),
            timeout,
          ])
          if (result && 'data' in result && result.data) {
            const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path)
            setScreenshotUrl(urlData.publicUrl)
          }
        } catch {
          // Upload failed — proceed without screenshot URL
        }
      }

      setProgress(100)
      setStep('confirm')
    } catch (err) {
      console.error('OCR error:', err)
      toast.error('Nie udało się przetworzyć obrazu. Spróbuj ponownie.')
      setStep('upload')
    }
  }, [profile, supabase, onAttempt])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return
      setImageFile(file)
      processImage(file)
    },
    [processImage]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  })

  const handleConfirm = async () => {
    const steps = parseInt(manualSteps, 10)
    if (isNaN(steps) || steps <= 0 || steps > 100000) {
      toast.error('Podaj prawidłową liczbę kroków (1 – 100 000)')
      return
    }

    const today = new Date().toISOString().split('T')[0]

    try {
      await submitSteps.mutateAsync({
        stepCount: steps,
        entryDate: today,
        activeChallengeIds,
        screenshotUrl: screenshotUrl ?? undefined,
        ocrConfidence: confidence,
        ocrRawText,
      })

      setStep('done')
      toast.success(`✅ Zapisano ${formatSteps(steps)} kroków!`)
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    } catch (err: any) {
      toast.error(err?.message ?? 'Nie udało się zapisać kroków.')
    }
  }

  return (
    <div className="w-full space-y-4">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                'relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300',
                'min-h-[200px] flex flex-col items-center justify-center gap-4',
                isDragActive
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-white/20 bg-white/5 hover:border-primary/50 hover:bg-white/8'
              )}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-base font-bold">Wrzuć screenshot kroków</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Apple Health, Google Fit, Samsung Health
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Dotknij lub przeciągnij zdjęcie tutaj
                </p>
                <p className="text-xs text-amber-400/80 mt-2">
                  💡 Wejdź w <strong>szczegóły kroków</strong> (duża liczba na całym ekranie), nie dashboard
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-8"
          >
            {imagePreview && (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              </div>
            )}
            <div className="w-full space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Analizuję screenshot...</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              🔍 OCR szuka liczby kroków...
            </p>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Preview */}
            {imagePreview && (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden">
                <img src={imagePreview} alt="Screenshot" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setStep('upload'); setImagePreview(null) }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-xl"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Detected result */}
            <div className={cn(
              'p-4 rounded-2xl border',
              detectedSteps
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            )}>
              {detectedSteps ? (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Wykryta liczba kroków</p>
                    <p className="text-2xl font-black text-emerald-400">
                      {formatSteps(detectedSteps)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pewność: {Math.round(confidence * 100)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-400">Nie wykryto kroków</p>
                      <p className="text-xs text-muted-foreground">
                        Wpisz liczbę kroków ręcznie poniżej
                      </p>
                    </div>
                  </div>
                  {ocrRawText && (
                    <details className="mt-1">
                      <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                        🔍 Co odczytał OCR (debug)
                      </summary>
                      <pre className="mt-1 text-[10px] text-muted-foreground bg-white/5 rounded-lg p-2 max-h-28 overflow-y-auto whitespace-pre-wrap break-all">
                        {ocrRawText || '(brak tekstu)'}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Manual edit */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">
                Potwierdź lub popraw liczbę kroków
              </label>
              <Input
                type="number"
                value={manualSteps}
                onChange={(e) => setManualSteps(e.target.value)}
                placeholder="np. 8530"
                className="text-xl font-black text-center h-14"
                min={1}
                max={99999}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setStep('upload'); setImagePreview(null) }}
              >
                Ponów
              </Button>
              <Button
                className="flex-2 flex-grow"
                variant="gradient"
                onClick={handleConfirm}
                loading={submitSteps.isPending}
                disabled={!manualSteps || parseInt(manualSteps) <= 0}
              >
                Zapisz kroki 🚀
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-10"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-6xl"
            >
              🎉
            </motion.div>
            <div className="text-center">
              <p className="text-xl font-black">Kroki zapisane!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sprawdź swoje miejsce w rankingu
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
