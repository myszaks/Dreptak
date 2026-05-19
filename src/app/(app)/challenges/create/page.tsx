import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateChallengeForm } from '@/components/challenge/create-challenge-form'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function CreateChallengePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="page-container space-y-5">
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/challenges" className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black">Nowe Wyzwanie</h1>
        </div>
      </div>

      <CreateChallengeForm profile={profile as any} />
    </div>
  )
}
