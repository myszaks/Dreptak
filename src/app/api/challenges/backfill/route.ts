import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const challengeId = body?.challengeId
  if (!challengeId) return NextResponse.json({ error: 'Missing challengeId' }, { status: 400 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Verify challenge exists and membership
  const { data: challenge } = await admin.from('challenges').select('start_date, end_date').eq('id', challengeId).maybeSingle()
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const { data: membership } = await admin.from('challenge_members').select('id').eq('challenge_id', challengeId).eq('user_id', user.id).maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const { data: existingEntries } = await admin
    .from('step_entries')
    .select('entry_date, step_count')
    .eq('user_id', user.id)
    .gte('entry_date', challenge.start_date)
    .lte('entry_date', challenge.end_date)
    .order('entry_date', { ascending: true })

  const dailyMax = new Map()
  for (const row of (existingEntries ?? [])) {
    const prev = dailyMax.get(row.entry_date) ?? 0
    if (row.step_count > prev) dailyMax.set(row.entry_date, row.step_count)
  }

  let inserted = 0
  if (dailyMax.size > 0) {
    const rows = Array.from(dailyMax.entries()).map(([entry_date, step_count]) => ({
      challenge_id: challengeId,
      user_id: user.id,
      entry_date,
      step_count,
      is_edited: false,
    }))

    const { error } = await admin
      .from('step_entries')
      .upsert(rows, { onConflict: 'challenge_id,user_id,entry_date' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = rows.length
  }

  return NextResponse.json({ ok: true, backfilled: inserted })
}
