import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotification } from '@/lib/notifications'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/test/send-notification
 * 
 * Test endpoint do wysyłania push notifications.
 * 
 * Headers (na produkcji):
 * - x-test-secret: <TEST_ENDPOINT_SECRET>
 * 
 * Body:
 * {
 *   "userId": "user-id",
 *   "title": "Test Title" (optional),
 *   "body": "Test message" (optional)
 * }
 */
export async function POST(req: NextRequest) {
  // Allow on localhost OR with valid secret token
  const origin = req.headers.get('origin') ?? ''
  const isLocalhost = origin.includes('localhost')
  const secret = req.headers.get('x-test-secret')
  const validSecret = process.env.TEST_ENDPOINT_SECRET && secret === process.env.TEST_ENDPOINT_SECRET
  
  if (!isLocalhost && !validSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const { userId, title, body } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Get push tokens for this user
    const { data: tokenRows, error: tokenError } = await adminSupabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)

    if (tokenError) {
      return NextResponse.json(
        { error: `Token fetch error: ${tokenError.message}` },
        { status: 500 }
      )
    }

    const tokens = (tokenRows ?? []).map(r => r.token)

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'No push tokens registered for this user' },
        { status: 404 }
      )
    }

    // Send test notification
    const result = await sendPushNotification({
      tokens,
      title: title ?? '🧪 Test Notification',
      body: body ?? 'If you see this, push notifications are working!',
      deepLink: '/home',
      type: 'test',
    })

    // Clean up invalid tokens
    if (result.invalidTokens.length > 0) {
      await adminSupabase
        .from('push_tokens')
        .delete()
        .in('token', result.invalidTokens)
    }

    return NextResponse.json({
      ok: true,
      tokensCount: tokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      invalidTokensRemoved: result.invalidTokens.length,
    })
  } catch (err: any) {
    console.error('[test-notification] error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to send notification' },
      { status: 500 }
    )
  }
}
