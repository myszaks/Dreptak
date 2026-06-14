import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CreateChallengeForm } from '@/components/challenge/create-challenge-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditChallengePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const selectQuery = `*`

  const { data: challenge } = isUuid
    ? await supabase.from('challenges').select(selectQuery).eq('id', slug).single()
    : await supabase.from('challenges').select(selectQuery).eq('slug', slug).single()

  if (!challenge) notFound()

  if (challenge.created_by !== user.id) {
    // Only creator can edit
    redirect(`/challenges/${challenge.slug ?? challenge.id}`)
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="page-container space-y-5">
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/challenges/${challenge.slug ?? challenge.id}`} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black">Edytuj Wyzwanie</h1>
        </div>
      </div>

      <CreateChallengeForm profile={profile as any} challenge={challenge as any} />
    </div>
  )
}
