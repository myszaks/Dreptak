'use client'

import { useAuth } from '@/hooks/use-auth'

/**
 * Wywołuje useAuth() w ramach (app) layout, żeby profile był
 * zawsze załadowany niezależnie od strony, na którą trafia użytkownik.
 */
export function AuthInitializer() {
  useAuth()
  return null
}
