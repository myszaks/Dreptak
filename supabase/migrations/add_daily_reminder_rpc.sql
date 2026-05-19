-- ============================================================
-- DREPTAK - RPC do pobierania użytkowników bez kroków na dziś
--
-- INSTRUKCJA:
-- 1. Wejdź na https://supabase.com/dashboard
-- 2. Wybierz projekt → SQL Editor
-- 3. Wklej całą zawartość tego pliku i kliknij RUN
-- ============================================================

-- Zwraca user_id wszystkich użytkowników, którzy:
-- 1. Są członkami przynajmniej jednego AKTYWNEGO wyzwania (trwa dziś)
-- 2. NIE dodali żadnych kroków dla tego wyzwania w podanym dniu
-- Używamy SECURITY DEFINER żeby ominąć RLS (działa jako serwis)
create or replace function public.get_users_needing_step_reminder(p_date date)
returns table(user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct cm.user_id
  from challenge_members cm
  inner join challenges c on c.id = cm.challenge_id
  where c.start_date <= p_date
    and c.end_date   >= p_date
    and not exists (
      select 1
      from step_entries se
      where se.user_id      = cm.user_id
        and se.challenge_id = cm.challenge_id
        and se.entry_date   = p_date
    );
$$;

select 'add_daily_reminder_rpc applied successfully' as status;
