'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, Suspense } from 'react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail } from 'lucide-react'

type Mode = 'login' | 'register'

function AuthContent() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const nextPathRaw = searchParams.get('next') ?? '/home'
  const nextPath = nextPathRaw.startsWith('/') ? nextPathRaw : '/home'

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signInWithGoogle(nextPath)
    } catch {
      toast.error('Nie udało się zalogować przez Google.')
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || password.length < 6) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password)
        router.push(nextPath)
        router.refresh()
      } else {
        await signUpWithEmail(email.trim(), password)
        setEmailSent(true)
      }
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('Invalid login credentials')) {
        toast.error('Błędny email lub hasło.')
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Potwierdź swój email przed logowaniem.')
      } else if (msg.includes('User already registered')) {
        toast.error('Konto z tym emailem już istnieje. Zaloguj się.')
        setMode('login')
      } else if (msg.includes('Password should be')) {
        toast.error('Hasło musi mieć min. 6 znaków.')
      } else {
        toast.error(msg || 'Coś poszło nie tak.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-between p-6">
      {/* Logo area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-24 h-24 rounded-3xl  flex items-center justify-center "
        >
          <img
            src="/logo-source.png"
            alt="Dreptak logo"
            className="w-20 h-20 object-contain rounded-2xl"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl font-black gradient-text">Dreptak</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Rywalizuj ze znajomymi na kroki.
            <br />
            Fun, memy, trash talk. 🔥
          </p>
        </motion.div>
      </div>

      {/* Auth section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm space-y-4 pb-safe"
      >
        <AnimatePresence mode="wait">
          {emailSent ? (
            <motion.div
              key="email-sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center space-y-3 py-4"
            >
              <p className="text-4xl">📬</p>
              <p className="font-black text-lg">Sprawdź skrzynkę!</p>
              <p className="text-sm text-muted-foreground">
                Wysłaliśmy link potwierdzający na{' '}
                <span className="text-foreground font-semibold">{email}</span>.
                Kliknij w link, żeby aktywować konto.
              </p>
              <button
                className="text-xs text-primary underline"
                onClick={() => { setEmailSent(false); setMode('login') }}
              >
                Wróć do logowania
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Mode toggle */}
              <div className="flex bg-white/5 rounded-2xl p-1">
                {(['login', 'register'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                      mode === m
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {m === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}
                  </button>
                ))}
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailSubmit} className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Hasło (min. 6 znaków)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  loading={loading}
                  disabled={!email.trim() || password.length < 6}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-muted-foreground">lub</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Google */}
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full bg-white text-zinc-900 hover:bg-white/90 font-bold"
                onClick={handleGoogleLogin}
                loading={loading}
              >
                <svg className="w-5 h-5 mr-2 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Kontynuuj z Google
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[11px] text-center text-muted-foreground px-4">
          Logując się akceptujesz <Link href="/terms" className="underline text-primary">regulamin</Link>. Dane używane tylko na potrzeby wyzwań.
        </p>
      </motion.div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  )
}
