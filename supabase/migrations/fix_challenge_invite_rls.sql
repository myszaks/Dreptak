-- ============================================================
-- SZYBKA NAPRAWA: kod zaproszenia nie działa (RLS blokuje lookup)
--
-- Problem: challenges SELECT policy wymaga bycia członkiem,
-- ale żeby dołączyć przez invite_code trzeba najpierw znaleźć
-- challenge (chicken-and-egg).
--
-- Rozwiązanie: każdy zalogowany użytkownik może SELECT challenges.
-- Kod zaproszenia sam w sobie jest mechanizmem kontroli dostępu.
-- Treść (step_entries, reactions, activity_feed) nadal chroniona
-- osobnymi politykami wymagającymi członkostwa.
--
-- URUCHOM w: Supabase Dashboard → SQL Editor
-- ============================================================

drop policy if exists "challenges_select" on public.challenges;

create policy "challenges_select" on public.challenges
  for select using (auth.uid() is not null);
