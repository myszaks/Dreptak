'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import type { LeaderboardEntry, DailyLeaderboardEntry } from '@/types/database'
import { withTimeout } from '@/lib/with-timeout'

const DB_TIMEOUT_MS = 12_000

export function useChallengeLeaderboard(challengeId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['leaderboard', challengeId],
    enabled: !!challengeId,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      // Query step_entries directly + aggregate in JS.
      // Avoids the challenge_leaderboard view which can hang due to RLS/permission issues.
      const { data, error } = await withTimeout(
        supabase
          .from('step_entries')
          .select('user_id, step_count, entry_date, profiles(username, avatar_url)')
          .eq('challenge_id', challengeId),
        DB_TIMEOUT_MS,
        'Przekroczono czas ładowania rankingu'
      )

      if (error) throw error

      // Aggregate per user
      const userMap = new Map<string, {
        user_id: string
        username: string
        avatar_url: string | null
        total_steps: number
        days_submitted: number
        best_day: number
      }>()

      for (const entry of data ?? []) {
        const uid = entry.user_id
        const prof = entry.profiles as unknown as { username: string; avatar_url: string | null } | null
        if (!userMap.has(uid)) {
          userMap.set(uid, {
            user_id: uid,
            username: prof?.username ?? '',
            avatar_url: prof?.avatar_url ?? null,
            total_steps: 0,
            days_submitted: 0,
            best_day: 0,
          })
        }
        const u = userMap.get(uid)!
        u.total_steps += entry.step_count
        u.days_submitted += 1
        u.best_day = Math.max(u.best_day, entry.step_count)
      }

      return Array.from(userMap.values())
        .sort((a, b) => b.total_steps - a.total_steps)
        .map((u, i) => ({
          ...u,
          rank: i + 1,
          avg_steps: u.days_submitted > 0 ? Math.round(u.total_steps / u.days_submitted) : 0,
        }))
    },
    refetchInterval: 30_000,
  })
}

export function useDailyLeaderboard(challengeId: string, date: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['daily-leaderboard', challengeId, date],
    enabled: !!challengeId && !!date,
    queryFn: async (): Promise<DailyLeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('daily_leaderboard')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('entry_date', date)
        .order('rank', { ascending: true })

      if (error) throw error
      return (data ?? []).map((d) => ({
        challenge_id: d.challenge_id ?? '',
        entry_date: d.entry_date ?? '',
        user_id: d.user_id ?? '',
        username: d.username ?? '',
        avatar_url: d.avatar_url ?? null,
        step_count: d.step_count ?? 0,
        rank: d.rank ?? 0,
        entry_id: d.entry_id ?? '',
      }))
    },
  })
}

export function useStepEntries(challengeId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['step-entries', challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from('step_entries')
          .select(`
            *,
            profiles (username, avatar_url),
            reactions (*)
          `)
          .eq('challenge_id', challengeId)
          .order('entry_date', { ascending: false })
          .order('step_count', { ascending: false }),
        DB_TIMEOUT_MS,
        'Przekroczono czas ładowania wpisów'
      )

      if (error) throw error
      return data
    },
  })
}

export function useSubmitSteps() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      stepCount: number
      entryDate: string
      activeChallengeIds?: string[]
      screenshotUrl?: string
      ocrConfidence?: number
      ocrRawText?: string
    }) => {
      const profile = useAppStore.getState().profile
      if (!profile) throw new Error('Musisz być zalogowany')

      // Resolve active challenge IDs — use caller-supplied list when available (faster,
      // avoids an extra DB round-trip and potential join issues)
      let activeChallengeIds: string[]
      if (input.activeChallengeIds && input.activeChallengeIds.length > 0) {
        activeChallengeIds = input.activeChallengeIds
      } else {
        const today = new Date()
        const { data: memberships, error: memberErr } = await withTimeout(
          supabase
            .from('challenge_members')
            .select('challenge_id, challenges!inner(start_date, end_date)')
            .eq('user_id', profile.id),
          DB_TIMEOUT_MS,
          'Przekroczono czas pobierania aktywnych wyzwań'
        )
        if (memberErr) throw new Error(memberErr.message)
        activeChallengeIds = (memberships ?? [])
          .filter((m: any) => {
            const c = m.challenges
            return new Date(c.start_date) <= today && new Date(c.end_date) >= today
          })
          .map((m: any) => m.challenge_id as string)
      }

      if (activeChallengeIds.length === 0) {
        throw new Error('Nie masz aktywnych wyzwań')
      }

      // Check daily limit — query with a known challenge_id to satisfy RLS via index
      const { data: existing, error: existingErr } = await withTimeout(
        supabase
          .from('step_entries')
          .select('id, edit_expires_at')
          .eq('challenge_id', activeChallengeIds[0])
          .eq('user_id', profile.id)
          .eq('entry_date', input.entryDate)
          .maybeSingle(),
        DB_TIMEOUT_MS,
        'Przekroczono czas sprawdzania dzisiejszego wpisu'
      )
      if (existingErr) throw new Error(existingErr.message)

      if (existing) {
        const canEdit =
          existing.edit_expires_at != null &&
          new Date(existing.edit_expires_at) > new Date()
        if (!canEdit) {
          throw new Error(
            'Minął czas edycji (15 min). Nie możesz zmienić dzisiejszego wpisu.'
          )
        }
      }

      const editExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

      const entries = activeChallengeIds.map((challengeId: string) => ({
        challenge_id: challengeId,
        user_id: profile.id,
        entry_date: input.entryDate,
        step_count: input.stepCount,
        screenshot_url: input.screenshotUrl ?? null,
        ocr_confidence: input.ocrConfidence ?? null,
        ocr_raw_text: input.ocrRawText ?? null,
        edit_expires_at: editExpiresAt,
        is_edited: existing ? true : false,
      }))

      // Bulk upsert to all active challenges — no .select() to avoid RLS recursion
      const { error } = await withTimeout(
        supabase
          .from('step_entries')
          .upsert(entries, { onConflict: 'challenge_id,user_id,entry_date' }),
        DB_TIMEOUT_MS,
        'Przekroczono czas zapisu kroków'
      )

      if (error) throw new Error(error.message || 'Błąd podczas zapisywania kroków')

      return { challengeIds: activeChallengeIds }
    },
    onSuccess: ({ challengeIds }) => {
      const profile = useAppStore.getState().profile
      challengeIds.forEach((id: string) => {
        queryClient.invalidateQueries({ queryKey: ['leaderboard', id] })
        queryClient.invalidateQueries({ queryKey: ['step-entries', id] })
        // Fire-and-forget overtake check on the server
        if (profile?.id) {
          fetch('/api/notifications/trigger', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ type: 'check_overtake', challengeId: id, actorId: profile.id }),
          }).catch(() => {/* silent */})
        }
      })
      queryClient.invalidateQueries({ queryKey: ['daily-leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
    },
    onError: (error) => console.error('[useSubmitSteps] error:', error),
  })
}

export function useToggleReaction() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entryId,
      emoji,
      challengeId,
    }: {
      entryId: string
      emoji: string
      challengeId: string
    }) => {
      const profile = useAppStore.getState().profile
      if (!profile) throw new Error('Musisz być zalogowany')

      // Check if already reacted with this emoji
      const { data: existing } = await supabase
        .from('reactions')
        .select('id')
        .eq('entry_id', entryId)
        .eq('user_id', profile.id)
        .eq('emoji', emoji)
        .single()

      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id)
      } else {
        await supabase.from('reactions').insert({
          entry_id: entryId,
          user_id: profile.id,
          emoji,
        })

        // Feed event for reaction
        await supabase.from('activity_feed').insert({
          challenge_id: challengeId,
          type: 'reaction',
          actor_id: profile.id,
          entry_id: entryId,
          metadata: { emoji },
        })

        // Fetch entry owner + fire reaction notification (server-side)
        const { data: entry } = await supabase
          .from('step_entries')
          .select('user_id')
          .eq('id', entryId)
          .single()
        if (entry && entry.user_id !== profile.id) {
          fetch('/api/notifications/trigger', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              type:         'reaction_received',
              actorId:      profile.id,
              targetUserId: entry.user_id,
              challengeId,
              entryId,
            }),
          }).catch(() => {/* silent */})
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['step-entries', vars.challengeId] })
    },
  })
}
