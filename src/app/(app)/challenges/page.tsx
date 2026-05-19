import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChallengesClient } from './challenges-client'

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('challenge_members')
      .select(`role, joined_at, challenges (*)`)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false }),
  ])

  // Fetch actual member counts via SECURITY DEFINER RPC (bypasses user_id = auth.uid() RLS)
  const challengeIds = (memberships ?? []).map((m: any) => m.challenges?.id).filter(Boolean) as string[]
  const { data: memberCountRows } = challengeIds.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase as any).rpc('challenge_member_counts', { p_challenge_ids: challengeIds })
    : { data: [] }

  const memberCounts: Record<string, number> = {}
  for (const row of (memberCountRows ?? []) as Array<{ challenge_id: string; member_count: number }>) {
    memberCounts[row.challenge_id] = Number(row.member_count)
  }

  return (
    <ChallengesClient
      memberships={(memberships ?? []) as any}
      userId={user.id}
      profile={profile as any}
      memberCounts={memberCounts}
    />
  )
}
