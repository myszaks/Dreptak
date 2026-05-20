import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ code: string }>
}

export default async function JoinByCodePage({ params }: Props) {
  const { code } = await params
  const normalizedCode = code.trim().toUpperCase()
  const destination = `/challenges/join?code=${encodeURIComponent(normalizedCode)}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(destination)}`)
  }

  redirect(destination)
}
