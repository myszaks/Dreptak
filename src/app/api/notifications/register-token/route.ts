import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/notifications/register-token
 * Saves an FCM token for the authenticated user.
 * Body: { token: string; platform: 'web' | 'ios' | 'android'; deviceName?: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { token, platform, deviceName } = body as {
    token: string
    platform: 'web' | 'ios' | 'android'
    deviceName?: string
  }

  if (!token || !platform) {
    return NextResponse.json({ error: 'token and platform are required' }, { status: 400 })
  }

  // Upsert — update last_used_at on conflict so we know the token is still valid
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id:      user.id,
        token,
        platform,
        device_name:  deviceName ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    )

  if (error) {
    console.error('[register-token] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/notifications/register-token
 * Removes an FCM token (on logout or permission revoke).
 * Body: { token: string }
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json() as { token: string }
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('token', token)

  return NextResponse.json({ ok: true })
}
