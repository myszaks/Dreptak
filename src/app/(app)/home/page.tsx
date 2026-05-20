import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HomeClient } from './home-client'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch user's active challenges
  const { data: challenges } = await supabase
    .from('challenge_members')
    .select(`
      challenges (
        id, name, icon, slug, start_date, end_date, janusz_mode, invite_code, is_public
      )
    `)
    .eq('user_id', user.id)
    .limit(10)

  const activeChallenges = (challenges as any[])
    ?.map((cm) => cm.challenges)
    .filter(Boolean)
    .filter((c: any) => {
      if (!c) return false
      return new Date(c.end_date) >= new Date()
    }) ?? []

  const challengeIds = activeChallenges.map((c: any) => c.id).filter(Boolean) as string[]
  const { data: memberCountRows, error: memberCountError } = challengeIds.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase as any).rpc('challenge_member_counts', { p_challenge_ids: challengeIds })
    : { data: [], error: null }

  let resolvedMemberCountRows = (memberCountRows ?? []) as Array<{ challenge_id: string; member_count: number }>

  if (challengeIds.length > 0 && memberCountError) {
    console.error('Failed to load challenge member counts via RPC, falling back to challenge_members query.', memberCountError)

    const { data: fallbackMemberRows, error: fallbackMemberCountError } = await supabase
      .from('challenge_members')
      .select('challenge_id')
      .in('challenge_id', challengeIds)

    if (fallbackMemberCountError) {
      throw fallbackMemberCountError
    }

    const fallbackCounts: Record<string, number> = {}
    for (const row of (fallbackMemberRows ?? []) as Array<{ challenge_id: string }>) {
      fallbackCounts[row.challenge_id] = (fallbackCounts[row.challenge_id] ?? 0) + 1
    }

    resolvedMemberCountRows = Object.entries(fallbackCounts).map(([challenge_id, member_count]) => ({
      challenge_id,
      member_count,
    }))
  }

  const memberCounts: Record<string, number> = {}
  for (const row of resolvedMemberCountRows) {
    memberCounts[row.challenge_id] = Number(row.member_count)
  }

  const today = new Date().toISOString().split('T')[0]
  const { data: todayEntry } = await supabase
    .from('step_entries')
    .select('step_count, edit_expires_at')
    .eq('user_id', user.id)
    .eq('entry_date', today)
    .limit(1)
    .maybeSingle()

  return (
    <HomeClient
      profile={profile}
      activeChallenges={activeChallenges as any}
      memberCounts={memberCounts}
      todayEntry={todayEntry ?? null}
    />
  )
}
