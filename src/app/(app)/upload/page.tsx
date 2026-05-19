import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UploadClient } from './upload-client'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('challenge_members')
      .select(`challenges ( id, name, icon, start_date, end_date )`)
      .eq('user_id', user.id),
  ])

  const activeChallenges =
    (memberships as any[])
      ?.map((m) => m.challenges)
      .filter(Boolean)
      .filter((c: any) => {
        if (!c) return false
        const now = new Date()
        return new Date(c.start_date) <= now && new Date(c.end_date) >= now
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
    <UploadClient
      activeChallenges={activeChallenges as any}
      profile={profile as any}
      todayEntry={todayEntry ?? null}
    />
  )
}
