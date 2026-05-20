'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import type { Challenge, ChallengeWithMembers } from '@/types/database'
import { withTimeout } from '@/lib/with-timeout'

const DB_TIMEOUT_MS = 12_000

export function useChallenges() {
  const supabase = createClient()
  const profileId = useAppStore(s => s.profile?.id)

  return useQuery({
    queryKey: ['challenges', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const profile = useAppStore.getState().profile
      if (!profile) throw new Error('Not authenticated')
      console.log('[SUPABASE][CHALLENGES] start fetch', { userId: profile.id })
      const { data, error } = await supabase
        .from('challenge_members')
        .select(`
          joined_at,
          role,
          challenges (
            *,
            challenge_members (count)
          )
        `)
        .eq('user_id', profile.id)
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('[SUPABASE][CHALLENGES] error', { code: error.code, message: error.message, details: error.details, hint: error.hint })
        throw error
      }
      console.log('[SUPABASE][CHALLENGES] success', { count: data?.length ?? 0 })
      return data
    },
  })
}

export function useChallenge(challengeId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['challenge', challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          challenge_members (
            id,
            user_id,
            role,
            joined_at,
            profiles (
              id,
              username,
              avatar_url,
              total_steps
            )
          )
        `)
        .eq('id', challengeId)
        .single()

      if (error) throw error
      return data
    },
  })
}

export function useJoinChallenge() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const profile = useAppStore.getState().profile
      if (!profile) throw new Error('Musisz być zalogowany')

      // Find challenge by invite code
      const { data: challenge, error: findErr } = await withTimeout(
        supabase
          .from('challenges')
          .select('id, name, slug, start_date, end_date')
          .eq('invite_code', inviteCode.toUpperCase())
          .single(),
        DB_TIMEOUT_MS,
        'Przekroczono czas wyszukiwania wyzwania'
      )

      if (findErr) throw new Error('Nie znaleziono wyzwania z tym kodem.')

      // Check if already member
      const { data: existing, error: existingErr } = await withTimeout(
        supabase
          .from('challenge_members')
          .select('id')
          .eq('challenge_id', challenge.id)
          .eq('user_id', profile.id)
          .maybeSingle(),
        DB_TIMEOUT_MS,
        'Przekroczono czas sprawdzania członkostwa'
      )

      if (existingErr) throw existingErr

      if (existing) return challenge

      // Join
      const { error: joinErr } = await withTimeout(
        supabase
          .from('challenge_members')
          .insert({ challenge_id: challenge.id, user_id: profile.id }),
        DB_TIMEOUT_MS,
        'Przekroczono czas dołączania do wyzwania'
      )

      if (joinErr) throw joinErr

      // Backfill historycznych wpisów użytkownika dla zakresu dat wyzwania
      const { data: existingEntries, error: entriesErr } = await withTimeout(
        supabase
          .from('step_entries')
          .select('entry_date, step_count')
          .eq('user_id', profile.id)
          .gte('entry_date', challenge.start_date)
          .lte('entry_date', challenge.end_date)
          .order('entry_date', { ascending: true }),
        DB_TIMEOUT_MS,
        'Przekroczono czas pobierania historii kroków'
      )
      if (entriesErr) throw entriesErr

      const dailyMax = new Map<string, number>()
      for (const row of existingEntries ?? []) {
        const prev = dailyMax.get(row.entry_date) ?? 0
        if (row.step_count > prev) dailyMax.set(row.entry_date, row.step_count)
      }

      if (dailyMax.size > 0) {
        const rows = Array.from(dailyMax.entries()).map(([entry_date, step_count]) => ({
          challenge_id: challenge.id,
          user_id: profile.id,
          entry_date,
          step_count,
          is_edited: false,
        }))

        const { error: backfillErr } = await withTimeout(
          supabase
            .from('step_entries')
            .upsert(rows, { onConflict: 'challenge_id,user_id,entry_date' }),
          DB_TIMEOUT_MS,
          'Przekroczono czas uzupełniania historii kroków'
        )
        if (backfillErr) throw backfillErr
      }

      // Create activity feed item
      const { error: feedErr } = await withTimeout(
        supabase.from('activity_feed').insert({
          challenge_id: challenge.id,
          type: 'member_joined',
          actor_id: profile.id,
        }),
        DB_TIMEOUT_MS,
        'Przekroczono czas zapisu aktywności'
      )
      if (feedErr) throw feedErr

      return challenge
    },
    onSuccess: (challenge) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      queryClient.invalidateQueries({ queryKey: ['challenge-member-count', challenge.id] })
      queryClient.invalidateQueries({ queryKey: ['home-member-counts'] })
    },
  })
}

export function useCreateChallenge() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      name: string
      description?: string
      icon?: string
      start_date: string
      end_date: string
      is_public?: boolean
      janusz_mode?: boolean
      janusz_penalty_text?: string
    }) => {
      const profile = useAppStore.getState().profile
      if (!profile) throw new Error('Musisz być zalogowany')

      const id = crypto.randomUUID()
      const { error: insertError } = await withTimeout(
        supabase
          .from('challenges')
          .insert({
            id,
            ...input,
            created_by: profile.id,
          }),
        DB_TIMEOUT_MS,
        'Przekroczono czas tworzenia wyzwania'
      )

      if (insertError) {
        console.error('[createChallenge insert]', insertError)
        throw new Error(insertError.message || 'Błąd podczas tworzenia wyzwania')
      }

      // Drugorzędne inserty — równolegle, nie blokują głównego flow
      await Promise.allSettled([
        withTimeout(
          supabase
            .from('challenge_members')
            .insert({ challenge_id: id, user_id: profile.id, role: 'admin' }),
          DB_TIMEOUT_MS,
          'Przekroczono czas dodawania członkostwa'
        ),
        withTimeout(
          supabase
            .from('activity_feed')
            .insert({ challenge_id: id, type: 'challenge_started', actor_id: profile.id }),
          DB_TIMEOUT_MS,
          'Przekroczono czas zapisu aktywności'
        ),
      ])

      // Pobierz slug wygenerowany przez trigger
      const { data: created } = await withTimeout(
        supabase
          .from('challenges')
          .select('slug')
          .eq('id', id)
          .single(),
        DB_TIMEOUT_MS,
        'Przekroczono czas pobierania nowego wyzwania'
      )

      return { id, slug: created?.slug ?? id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
    },
    onError: (error) => {
      console.error('[useCreateChallenge] error:', error)
    },
  })
}
