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
        id, name, icon, start_date, end_date, janusz_mode, invite_code, is_public,
        challenge_members (count)
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
      todayEntry={todayEntry ?? null}
    />
  )
}
