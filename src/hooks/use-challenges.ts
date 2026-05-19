'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import type { Challenge, ChallengeWithMembers } from '@/types/database'

export function useChallenges() {
  const supabase = createClient()
  const profileId = useAppStore(s => s.profile?.id)

  return useQuery({
    queryKey: ['challenges', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const profile = useAppStore.getState().profile
      if (!profile) throw new Error('Not authenticated')
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

      if (error) throw error
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
      const { data: challenge, error: findErr } = await supabase
        .from('challenges')
        .select('id, name, slug')
        .eq('invite_code', inviteCode.toUpperCase())
        .single()

      if (findErr) throw new Error('Nie znaleziono wyzwania z tym kodem.')

      // Check if already member
      const { data: existing } = await supabase
        .from('challenge_members')
        .select('id')
        .eq('challenge_id', challenge.id)
        .eq('user_id', profile.id)
        .single()

      if (existing) return challenge

      // Join
      const { error: joinErr } = await supabase
        .from('challenge_members')
        .insert({ challenge_id: challenge.id, user_id: profile.id })

      if (joinErr) throw joinErr

      // Create activity feed item
      await supabase.from('activity_feed').insert({
        challenge_id: challenge.id,
        type: 'member_joined',
        actor_id: profile.id,
      })

      return challenge
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
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
      // Abort po 12 sekundach — zapobiega wiecznym spinneram na słabej sieci
      const signal = AbortSignal.timeout(12_000)

      const { error: insertError } = await supabase
        .from('challenges')
        .insert({
          id,
          ...input,
          created_by: profile.id,
        })
        .abortSignal(signal)

      if (insertError) {
        console.error('[createChallenge insert]', insertError)
        throw new Error(insertError.message || 'Błąd podczas tworzenia wyzwania')
      }

      // Drugorzędne inserty — równolegle, nie blokują głównego flow
      await Promise.allSettled([
        supabase
          .from('challenge_members')
          .insert({ challenge_id: id, user_id: profile.id, role: 'admin' })
          .abortSignal(signal),
        supabase
          .from('activity_feed')
          .insert({ challenge_id: id, type: 'challenge_started', actor_id: profile.id })
          .abortSignal(signal),
      ])

      // Pobierz slug wygenerowany przez trigger
      const { data: created } = await supabase
        .from('challenges')
        .select('slug')
        .eq('id', id)
        .single()
        .abortSignal(signal)

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
