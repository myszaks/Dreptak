import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/notifications'

/**
 * POST /api/notifications/send
 * Internal endpoint — sends push + persists in-app notification.
 *
 * Body: {
 *   userIds: string[]      — target users
 *   type: string
 *   title: string
 *   body: string
 *   deepLink?: string
 *   challengeId?: string
 *   entryId?: string
 *   metadata?: Record<string, unknown>
 * }
 *
 * Auth: Must be authenticated. In future wire to a service-role call from
 * Supabase Edge Functions or a cron endpoint with a shared secret.
 */
export async function POST(req: NextRequest) {
  // Allow both user-auth and a shared API secret (for cron/edge calls)
  const authHeader = req.headers.get('authorization') ?? ''
  const isServiceCall = authHeader === `Bearer ${process.env.NOTIFICATIONS_API_SECRET}`

  if (!isServiceCall) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    userIds: string[]
    type: string
    title: string
    body: string
    deepLink?: string
    challengeId?: string
    entryId?: string
    metadata?: Record<string, unknown>
  }

  const { userIds, type, title, body: notifBody, deepLink, challengeId, entryId, metadata } = body

  if (!userIds?.length || !type || !title || !notifBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Use service role to bypass RLS (read tokens + insert notifications)
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. Persist in-app notifications
  const notifRows = userIds.map((userId) => ({
    user_id:       userId,
    type,
    title,
    body:          notifBody,
    read:          false,
    deep_link:     deepLink     ?? null,
    challenge_id:  challengeId  ?? null,
    entry_id:      entryId      ?? null,
    metadata_json: metadata     ?? null,
  }))

  const { error: insertError } = await adminSupabase
    .from('notifications')
    .insert(notifRows)

  if (insertError) {
    console.error('[send] insert notifications error:', insertError)
  }

  // 2. Fetch push tokens for all target users
  const { data: tokenRows, error: tokenError } = await adminSupabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)

  if (tokenError) {
    console.error('[send] fetch tokens error:', tokenError)
    return NextResponse.json({ ok: true, push: null })
  }

  const tokens = (tokenRows ?? []).map((r) => r.token)

  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, push: { sent: 0 } })
  }

  // 3. Send FCM multicast
  const result = await sendPushNotification({
    tokens,
    title,
    body:     notifBody,
    deepLink: deepLink ?? '/',
    type,
    data: {
      challenge_id: challengeId ?? '',
      entry_id:     entryId     ?? '',
    },
  })

  // 4. Clean up invalid tokens
  if (result.invalidTokens.length > 0) {
    await adminSupabase
      .from('push_tokens')
      .delete()
      .in('token', result.invalidTokens)
  }

  return NextResponse.json({
    ok:   true,
    push: { sent: result.successCount, failed: result.failureCount },
  })
}
