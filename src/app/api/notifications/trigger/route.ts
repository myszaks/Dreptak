import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/notifications'

/**
 * POST /api/notifications/trigger
 * Server-side notification triggers for app events.
 *
 * Body: {
 *   type: 'check_overtake' | 'daily_reminder' | 'reaction_received' | 'challenge_ending'
 *   challengeId?: string
 *   actorId?: string        — user who performed the action
 *   targetUserId?: string   — user who should receive the notification
 *   entryId?: string
 *   metadata?: Record<string, unknown>
 * }
 *
 * Auth: shared API secret header OR authenticated user.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const isServiceCall = authHeader === `Bearer ${process.env.NOTIFICATIONS_API_SECRET}`

  if (!isServiceCall) {
    // Allow internal calls from the same app without the secret (server actions etc.)
    // but NOT unauthenticated external calls
    const origin = req.headers.get('origin') ?? ''
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    if (!origin.startsWith(appUrl)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await req.json() as {
    type: string
    challengeId?: string
    actorId?: string
    targetUserId?: string
    entryId?: string
    metadata?: Record<string, unknown>
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  switch (body.type) {
    case 'check_overtake':
      return handleOvertake(body.challengeId!, body.actorId!, adminSupabase)
    case 'reaction_received':
      return handleReaction(body.actorId!, body.targetUserId!, body.challengeId!, body.entryId!, adminSupabase)
    case 'challenge_ending':
      return handleChallengeEnding(body.challengeId!, adminSupabase)
    default:
      return NextResponse.json({ error: 'Unknown trigger type' }, { status: 400 })
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleOvertake(
  challengeId: string,
  actorId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
) {
  // Get current leaderboard for this challenge
  const { data: entries } = await supabase
    .from('step_entries')
    .select('user_id, step_count, profiles(username)')
    .eq('challenge_id', challengeId)

  if (!entries || entries.length === 0) return NextResponse.json({ ok: true })

  // Aggregate per user
  const userTotals = new Map<string, { total: number; username: string }>()
  for (const e of entries) {
    const uid = e.user_id
    const prof = e.profiles as unknown as { username: string } | null
    if (!userTotals.has(uid)) {
      userTotals.set(uid, { total: 0, username: prof?.username ?? 'Ktoś' })
    }
    userTotals.get(uid)!.total += e.step_count
  }

  // Sort: index 0 = highest score
  const sorted = Array.from(userTotals.entries())
    .sort((a, b) => b[1].total - a[1].total)

  const actorIdx = sorted.findIndex(([uid]) => uid === actorId)
  if (actorIdx <= 0) return NextResponse.json({ ok: true }) // already #1 or not found

  const actorName   = sorted[actorIdx][1].username
  const actorTotal  = sorted[actorIdx][1].total
  // Users that actor now outranks and who are just below their new rank
  const overtakenUsers: string[] = []
  for (let i = actorIdx - 1; i >= 0; i--) {
    const [uid, data] = sorted[i]
    if (uid === actorId) continue
    if (data.total < actorTotal) {
      // Actor just passed this user
      overtakenUsers.push(uid)
    } else {
      break // Actor hasn't passed them
    }
  }

  if (overtakenUsers.length === 0) return NextResponse.json({ ok: true })

  const gap = actorTotal - sorted[actorIdx - 1][1].total

  // Build notifications for each overtaken user
  const notifRows = overtakenUsers.map((uid) => ({
    user_id:      uid,
    type:         'leaderboard_overtake',
    title:        `${actorName} właśnie cię wyprzedził 👀`,
    body:         `Masz teraz ${gap.toLocaleString('pl-PL')} kroków straty. Czas nadrobić!`,
    read:         false,
    deep_link:    `/challenges/${challengeId}`,
    challenge_id: challengeId,
  }))

  await supabase.from('notifications').insert(notifRows)

  // Send push
  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', overtakenUsers)

  const tokens = (tokenRows ?? []).map((r) => r.token)
  if (tokens.length > 0) {
    const result = await sendPushNotification({
      tokens,
      title: `${actorName} właśnie cię wyprzedził 👀`,
      body:  `Masz teraz ${gap.toLocaleString('pl-PL')} kroków straty. Czas nadrobić!`,
      deepLink: `/challenges/${challengeId}`,
      type: 'leaderboard_overtake',
    })
    if (result.invalidTokens.length > 0) {
      await supabase.from('push_tokens').delete().in('token', result.invalidTokens)
    }
  }

  return NextResponse.json({ ok: true, notified: overtakenUsers.length })
}

async function handleReaction(
  actorId: string,
  targetUserId: string,
  challengeId: string,
  entryId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
) {
  if (actorId === targetUserId) return NextResponse.json({ ok: true })

  const { data: actor } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', actorId)
    .single()

  const actorName = actor?.username ?? 'Ktoś'
  const title = `${actorName} zareagował na Twój wpis 😄`
  const body  = 'Sprawdź co napisał!'

  await supabase.from('notifications').insert({
    user_id:      targetUserId,
    type:         'reaction_received',
    title,
    body,
    read:         false,
    deep_link:    challengeId ? `/challenges/${challengeId}` : '/',
    challenge_id: challengeId ?? null,
    entry_id:     entryId     ?? null,
  })

  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', targetUserId)

  const tokens = (tokenRows ?? []).map((r) => r.token)
  if (tokens.length > 0) {
    await sendPushNotification({ tokens, title, body, deepLink: `/challenges/${challengeId}`, type: 'reaction_received' })
  }

  return NextResponse.json({ ok: true })
}

async function handleChallengeEnding(
  challengeId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
) {
  const { data: challenge } = await supabase
    .from('challenges')
    .select('name, slug, end_date')
    .eq('id', challengeId)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const { data: members } = await supabase
    .from('challenge_members')
    .select('user_id')
    .eq('challenge_id', challengeId)

  const userIds = (members ?? []).map((m) => m.user_id)
  if (userIds.length === 0) return NextResponse.json({ ok: true })

  const deepLink = `/challenges/${challenge.slug ?? challengeId}`
  const title = `Wyzwanie "${challenge.name}" kończy się jutro! ⏳`
  const body  = 'Ostatni dzień na dodanie kroków. Nie zmarnuj szansy!'

  const notifRows = userIds.map((uid) => ({
    user_id: uid, type: 'challenge_ending', title, body,
    read: false, deep_link: deepLink, challenge_id: challengeId,
  }))
  await supabase.from('notifications').insert(notifRows)

  const { data: tokenRows } = await supabase
    .from('push_tokens').select('token').in('user_id', userIds)

  const tokens = (tokenRows ?? []).map((r) => r.token)
  if (tokens.length > 0) {
    const result = await sendPushNotification({ tokens, title, body, deepLink, type: 'challenge_ending' })
    if (result.invalidTokens.length > 0) {
      await supabase.from('push_tokens').delete().in('token', result.invalidTokens)
    }
  }

  return NextResponse.json({ ok: true, notified: userIds.length })
}
