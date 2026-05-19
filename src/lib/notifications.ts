import { getAdminMessaging } from './firebase-admin'
import type { MulticastMessage } from 'firebase-admin/messaging'

export interface SendNotificationOptions {
  tokens: string[]
  title: string
  body: string
  icon?: string
  deepLink?: string
  type?: string
  data?: Record<string, string>
}

export interface SendResult {
  successCount: number
  failureCount: number
  /** Tokens that returned a "registration not found / invalid" error and should be deleted. */
  invalidTokens: string[]
}

/**
 * Send a push notification to a list of FCM tokens via multicast.
 * Returns the result including any tokens that should be removed from the DB.
 */
export async function sendPushNotification(
  opts: SendNotificationOptions,
): Promise<SendResult> {
  if (opts.tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] }
  }

  const messaging = getAdminMessaging()

  const message: MulticastMessage = {
    tokens: opts.tokens,
    notification: {
      title: opts.title,
      body:  opts.body,
    },
    webpush: {
      notification: {
        title:   opts.title,
        body:    opts.body,
        icon:    opts.icon ?? '/icons/icon-192.png',
        badge:   '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag:     opts.type ?? 'dreptak',
        renotify: true,
      },
      fcmOptions: { link: opts.deepLink ?? '/' },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
        },
      },
    },
    data: {
      deep_link: opts.deepLink ?? '/',
      type:      opts.type     ?? 'generic',
      ...opts.data,
    },
  }

  const response = await messaging.sendEachForMulticast(message)

  const invalidTokens: string[] = []
  response.responses.forEach((resp, i) => {
    if (!resp.success) {
      const code = resp.error?.code ?? ''
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(opts.tokens[i])
      }
    }
  })

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  }
}
