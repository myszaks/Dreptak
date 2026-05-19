-- ============================================================
-- DREPTAK - Naprawa RLS (infinite recursion 42P17)
-- 
-- INSTRUKCJA:
-- 1. Wejdź na https://supabase.com/dashboard
-- 2. Wybierz projekt → SQL Editor
-- 3. Wklej całą zawartość tego pliku i kliknij RUN
-- ============================================================

-- Krok 1: Funkcja pomocnicza security definer
-- Sprawdza członkostwo BEZ odpytywania RLS (security definer omija polityki)
create or replace function public.is_challenge_member(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.challenge_members
    where challenge_id = p_challenge_id
      and user_id = auth.uid()
  );
$$;

-- Krok 2: Usuń WSZYSTKIE stare polityki (żeby uniknąć konfliktów)
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'challenges','challenge_members','step_entries',
        'reactions','activity_feed','challenge_punishment_votes'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Krok 3: Nowe polityki bez rekurencji

-- === challenges ===
-- Any authenticated user can SELECT challenges (needed for invite-code join lookup).
-- Invite code is the access-control mechanism; detailed content (entries/reactions)
-- is still protected by its own member-only policies.
create policy "challenges_select" on public.challenges
  for select using (auth.uid() is not null);

create policy "challenges_insert" on public.challenges
  for insert with check (auth.uid() = created_by);

create policy "challenges_update" on public.challenges
  for update using (
    auth.uid() = created_by
    or public.is_challenge_member(id)
  );

create policy "challenges_delete" on public.challenges
  for delete using (auth.uid() = created_by);

-- === challenge_members ===
-- PROSTE: każdy użytkownik widzi tylko swoje wiersze — eliminuje self-join
create policy "challenge_members_select" on public.challenge_members
  for select using (user_id = auth.uid());

create policy "challenge_members_insert" on public.challenge_members
  for insert with check (auth.uid() = user_id);

create policy "challenge_members_delete" on public.challenge_members
  for delete using (auth.uid() = user_id);

-- === step_entries ===
create policy "step_entries_select" on public.step_entries
  for select using (public.is_challenge_member(challenge_id));

create policy "step_entries_insert" on public.step_entries
  for insert with check (auth.uid() = user_id);

create policy "step_entries_update" on public.step_entries
  for update using (
    auth.uid() = user_id
    and (edit_expires_at is null or edit_expires_at > now())
  );

-- === reactions ===
create policy "reactions_select" on public.reactions
  for select using (
    exists (
      select 1 from public.step_entries se
      where se.id = entry_id
        and public.is_challenge_member(se.challenge_id)
    )
  );

create policy "reactions_insert" on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "reactions_delete" on public.reactions
  for delete using (auth.uid() = user_id);

-- === activity_feed ===
create policy "activity_feed_select" on public.activity_feed
  for select using (public.is_challenge_member(challenge_id));

create policy "activity_feed_insert" on public.activity_feed
  for insert with check (auth.uid() = actor_id or actor_id is null);

-- === challenge_punishment_votes ===
create policy "cpv_select" on public.challenge_punishment_votes
  for select using (public.is_challenge_member(challenge_id));

create policy "cpv_insert" on public.challenge_punishment_votes
  for insert with check (auth.uid() = voter_id);

-- Krok 4: Batch RPC do pobierania liczby uczestników wielu wyzwań jednocześnie
-- SECURITY DEFINER omija RLS (user_id = auth.uid()), dzięki czemu widzimy WSZYSTKICH uczestników
create or replace function public.challenge_member_counts(p_challenge_ids uuid[])
returns table(challenge_id uuid, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select challenge_id, count(*) as member_count
  from public.challenge_members
  where challenge_id = any(p_challenge_ids)
  group by challenge_id;
$$;

select 'RLS fix + challenge_member_counts RPC applied successfully' as status;
