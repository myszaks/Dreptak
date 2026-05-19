import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/notifications'

/**
 * GET /api/cron/daily-reminder
 *
 * Wywoływany przez Vercel Cron codziennie o 18:00 UTC (= 20:00 CEST / 19:00 CET).
 * Wysyła push notification do użytkowników, którzy mają aktywne wyzwanie
 * ale NIE dodali jeszcze kroków na dziś.
 *
 * Auth: nagłówek Authorization: Bearer <CRON_SECRET>
 * (Vercel ustawia to automatycznie; lokalnie testuj ręcznie)
 */

const FUNNY_MESSAGES = [
  {
    title: '🦥 Hej, dzisiaj w ogóle wychodzisz?',
    body: 'Kroki same siebie nie wpiszą! Jeszcze zdążysz przed końcem dnia.',
  },
  {
    title: '👟 Te buty to dekoracja?',
    body: 'Nie zapomnij dodać kroków – wyzwanie nie poczeka!',
  },
  {
    title: '🏃 Biegasz bez telefonu?',
    body: 'Wróć do Dreptak i daj znać ile dzisiaj nakręciłeś/aś!',
  },
  {
    title: '📸 Zdjęcie nie zrobi się samo',
    body: 'Wrzuć screena z krokami i pokaż znajomym co potrafisz!',
  },
  {
    title: '😴 Jeszcze nie śpisz, prawda?',
    body: 'Szybko dodaj dzisiejsze kroki i śpij spokojnie!',
  },
  {
    title: '🤔 O czymś zapomniałeś/aś?',
    body: 'Tak, kroków na dziś! Nie odpuszczaj wyzwaniu – serio.',
  },
  {
    title: '👀 Znajomi już są w rankingu...',
    body: 'A Ty jeszcze nie! Dodaj kroki i wskocz na szczyt!',
  },
  {
    title: '⏰ Ostatni dzwonek na kroki!',
    body: 'Jutro będzie za późno na dzisiejszy wynik. Działaj!',
  },
  {
    title: '🦆 Kwa kwa! Pamiętasz o krokach?',
    body: 'Twój dziennik kroków woła o ratunek. Nie zawiedź go!',
  },
  {
    title: '🎯 Cel nie spełni się bez Ciebie',
    body: 'Zapisz kroki i pokaż, że tym razem się nie poddasz!',
  },
] as const

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets this automatically in production)
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Today's date in Polish timezone (Europe/Warsaw)
  // so we never accidentally send "yesterday" reminders at 20:00 CET
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' })

  // Find users with active challenges who haven't submitted steps today
  const { data: usersToRemind, error: rpcError } = await adminSupabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .rpc('get_users_needing_step_reminder' as any, { p_date: today })

  if (rpcError) {
    console.error('[daily-reminder] RPC error:', rpcError.message)
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const userIds = (usersToRemind as Array<{ user_id: string }> ?? []).map(r => r.user_id)

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Wszyscy dodali kroki dziś – brawo!' })
  }

  // Get push tokens for these users
  const { data: tokenRows, error: tokenError } = await adminSupabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)

  if (tokenError) {
    console.error('[daily-reminder] token fetch error:', tokenError.message)
    return NextResponse.json({ error: tokenError.message }, { status: 500 })
  }

  const tokens = (tokenRows ?? []).map(r => r.token)

  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Brak tokenów push dla tych użytkowników.' })
  }

  // Pick a random funny message (same one for the whole batch that day)
  const msg = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]

  // Send push notifications
  const result = await sendPushNotification({
    tokens,
    title: msg.title,
    body:  msg.body,
    deepLink: '/upload',
    type: 'daily_reminder',
  })

  // Clean up invalid / stale tokens
  if (result.invalidTokens.length > 0) {
    await adminSupabase
      .from('push_tokens')
      .delete()
      .in('token', result.invalidTokens)
  }

  // Persist in-app notification for each unique user
  const uniqueUserIds = [...new Set((tokenRows ?? []).map(r => r.user_id))]
  const notifRows = uniqueUserIds.map(userId => ({
    user_id:   userId,
    type:      'daily_reminder',
    title:     msg.title,
    body:      msg.body,
    read:      false,
    deep_link: '/upload',
  }))

  if (notifRows.length > 0) {
    const { error: notifError } = await adminSupabase.from('notifications').insert(notifRows)
    if (notifError) {
      // Log but don't fail – push already sent
      console.error('[daily-reminder] notification insert error:', notifError.message)
    }
  }

  console.log(`[daily-reminder] date=${today} usersToRemind=${userIds.length} tokens=${tokens.length} sent=${result.successCount} failed=${result.failureCount}`)

  return NextResponse.json({
    ok:             true,
    date:           today,
    usersToRemind:  userIds.length,
    sent:           result.successCount,
    failed:         result.failureCount,
  })
}
