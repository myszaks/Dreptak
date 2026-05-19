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

  const selectQuery = `*`

  const { data: challenge, error: challengeError } = isUuid
    ? await supabase.from('challenges').select(selectQuery).eq('id', slug).single()
    : await supabase.from('challenges').select(selectQuery).eq('slug', slug).single()

  if (!challenge) {
    if (challengeError) {
      console.error('[challenge page] fetch error:', challengeError.message)
    }
    notFound()
  }

  const { count } = await supabase
    .from('challenge_members')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challenge.id)
    .eq('user_id', user.id)
  const isMember = (count ?? 0) > 0

  if (!isMember) redirect('/challenges')

  // Get actual member count via SECURITY DEFINER RPC (same source as list/home)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: countRows } = await (supabase as any).rpc('challenge_member_counts', {
    p_challenge_ids: [challenge.id],
  })
  const rpcCount = Number((countRows as Array<{ member_count: number }> | null)?.[0]?.member_count ?? 0)
  const memberCount = Number.isFinite(rpcCount) && rpcCount > 0
    ? rpcCount
    : Number(count ?? 1)

  return (
    <ChallengeDetailClient
      challenge={challenge as any}
      currentUserId={user.id}
      profile={profile as any}
      memberCount={memberCount}
    />
  )
}
