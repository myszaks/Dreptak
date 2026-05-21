import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileClient } from './profile-client'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: profile },
    { data: userAchievements },
    { data: challengeCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('user_achievements')
      .select(`created_at, achievements (*)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('challenge_members')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id),
  ])

  return (
    <ProfileClient
      profile={profile}
      achievements={userAchievements as any}
      totalChallenges={challengeCount?.length ?? 0}
    />
  )
}
