import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ChallengeDetailClient } from './challenge-detail-client'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  // Support both slug-based URLs (after migration) and UUID-based URLs (legacy / before migration)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const selectQuery = `
    *,
    challenge_members (
      id, user_id, role, joined_at,
      profiles (id, username, avatar_url, total_steps)
    )
  `

  const { data: challenge, error: challengeError } = isUuid
    ? await supabase.from('challenges').select(selectQuery).eq('id', slug).single()
    : await supabase.from('challenges').select(selectQuery).eq('slug', slug).single()

  if (!challenge) {
    if (challengeError) {
      console.error('[challenge page] fetch error:', challengeError.message)
    }
    notFound()
  }

  const challengeWithMembers = challenge as any

  // Check membership — first try the embedded list, then fall back to a direct count
  // (embedded select can return empty if RLS hasn't been fully migrated yet)
  let isMember = challengeWithMembers.challenge_members?.some(
    (m: any) => m.user_id === user.id
  )

  if (!isMember) {
    const { count } = await supabase
      .from('challenge_members')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', challenge.id)
      .eq('user_id', user.id)
    isMember = (count ?? 0) > 0
  }

  if (!isMember) redirect('/challenges')

  // Get actual member count via SECURITY DEFINER RPC (after fix_rls_recursion.sql,
  // embedded challenge_members only returns the current user's row)
  const { data: statsRows } = await supabase
    .rpc('get_challenge_stats', { p_challenge_id: challenge.id })
  const memberCount = Number((statsRows as any)?.[0]?.member_count ?? challengeWithMembers.challenge_members?.length ?? 0)

  return (
    <ChallengeDetailClient
      challenge={challengeWithMembers}
      currentUserId={user.id}
      profile={profile as any}
      memberCount={memberCount}
    />
  )
}
