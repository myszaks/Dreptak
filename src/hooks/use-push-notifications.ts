'use client'

import { useCallback, useEffect, useRef } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '@/lib/firebase-client'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? ''
/** Scope chosen to not conflict with next-pwa's sw.js at scope "/" */
const FCM_SW_URL   = '/firebase-messaging-sw.js'
const FCM_SW_SCOPE = '/fcm/'

// ─── Token registration ───────────────────────────────────────────────────────

async function getFcmRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

  // Register (or retrieve) the FCM-specific SW
  const existing = await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE)
  if (existing) return existing

  return navigator.serviceWorker.register(FCM_SW_URL, { scope: FCM_SW_SCOPE })
}

function detectPlatform(): 'ios' | 'android' | 'web' {
  if (typeof navigator === 'undefined') return 'web'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua))           return 'android'
  return 'web'
}

/** Register an FCM token with the server. Returns the token string on success. */
export async function registerPushToken(): Promise<string | null> {
  try {
    const messaging = await getFirebaseMessaging()
    if (!messaging) return null // unsupported browser

    const swReg = await getFcmRegistration()
    if (!swReg) return null

    const token = await getToken(messaging, {
      vapidKey:                VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })

    if (!token) return null

    const platform = detectPlatform()
    const deviceName = navigator.userAgent.slice(0, 120)

    await fetch('/api/notifications/register-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, platform, deviceName }),
    })

    return token
  } catch (err) {
    console.warn('[push] token registration failed:', err)
    return null
  }
}

/** Remove an FCM token from the server. */
export async function revokePushToken(token: string) {
  try {
    await fetch('/api/notifications/register-token', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
  } catch {
    // best-effort
  }
}

// ─── Foreground message listener ─────────────────────────────────────────────

/**
 * Listens for FCM messages while the app is in the foreground.
 * Calls onNotification with the payload whenever a message arrives.
 */
export function useForegroundMessages(
  onNotification: (title: string, body: string) => void,
) {
  const callbackRef = useRef(onNotification)
  callbackRef.current = onNotification

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    getFirebaseMessaging().then((messaging) => {
      if (!messaging) return
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? 'Dreptak'
        const body  = payload.notification?.body  ?? ''
        callbackRef.current(title, body)
      })
    })

    return () => {
      unsubscribe?.()
    }
  }, [])
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  )
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/** Request permission + register token. Returns the token on success. */
export async function requestAndRegister(): Promise<{ token: string | null; status: NotificationPermission }> {
  if (!isPushSupported()) return { token: null, status: 'denied' }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') return { token: null, status: permission }

  const token = await registerPushToken()
  return { token, status: 'granted' }
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

export function setAppBadge(count: number) {
  if ('setAppBadge' in navigator) {
    ;(navigator as Navigator & { setAppBadge: (n: number) => void }).setAppBadge(count)
  }
}

export function clearAppBadge() {
  if ('clearAppBadge' in navigator) {
    ;(navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge()
  }
}
