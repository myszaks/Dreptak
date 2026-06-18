import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JoinClient } from './join-client'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

function JoinClientWrapper({
  profile,
  code,
}: {
  profile: any
  code?: string
}) {
  return <JoinClient profile={profile} initialCode={code?.trim().toUpperCase()} />
}

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

  return (
    <Suspense fallback={<div className="page-container">Ładowanie...</div>}>
      <JoinClientWrapper profile={profile as any} code={code} />
    </Suspense>
  )
}
