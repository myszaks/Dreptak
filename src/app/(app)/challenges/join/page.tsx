import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JoinClient } from './join-client'

export default async function JoinChallengePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <JoinClient profile={profile as any} />
}
