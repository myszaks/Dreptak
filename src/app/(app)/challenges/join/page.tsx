import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JoinClient } from './join-client'

export default async function JoinChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const supabase = await createClient()
  const { code } = await searchParams
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <JoinClient profile={profile as any} initialCode={code?.trim().toUpperCase()} />
}
