import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const id = parts[parts.length - 1]

  const { data: challenge, error: fetchErr } = await supabase
    .from('challenges')
    .select('created_by, slug')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (challenge.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await admin.from('challenges').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
