-- ============================================================
-- Naprawa: total_steps + streak
--
-- Problemy:
-- 1. sync_profile_total_steps sumował WSZYSTKIE wiersze step_entries
--    (po jednym na każde wyzwanie), przez co ta sama porcja kroków
--    była liczona wielokrotnie. Powinniśmy brać MAX(step_count) na
--    (user_id, entry_date) — bo wszystkie wpisy jednego dnia mają
--    tę samą liczbę kroków.
-- 2. Kolumna `streak` istnieje, ale nigdy nie była aktualizowana.
--
-- INSTRUKCJA:
-- Supabase Dashboard → SQL Editor → wklej i kliknij RUN
-- ============================================================

-- ============================================================
-- 1. Nowa wersja funkcji triggera
-- ============================================================
create or replace function public.sync_profile_total_steps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_steps  bigint;
  v_streak       integer;
  v_last_active  date;
  v_check_date   date;
  v_has_entry    boolean;
begin
  -- total_steps: jedna porcja kroków na dzień
  -- MAX() eliminuje duplikaty między wyzwaniami dla tego samego dnia
  select coalesce(sum(daily_max), 0)
  into v_total_steps
  from (
    select max(step_count) as daily_max
    from public.step_entries
    where user_id = new.user_id
    group by entry_date
  ) t;

  -- Ostatni aktywny dzień
  select max(entry_date)
  into v_last_active
  from public.step_entries
  where user_id = new.user_id;

  -- Streak: liczba kolejnych dni z wpisem, licząc wstecz od ostatniego wpisu.
  -- Streak jest aktywny gdy ostatni wpis to dziś lub wczoraj
  -- (nie karamy za brak wpisu w bieżącym dniu do momentu złożenia).
  v_streak := 0;
  if v_last_active is not null
     and v_last_active >= current_date - 1 then
    v_check_date := v_last_active;
    loop
      select exists(
        select 1 from public.step_entries
        where user_id = new.user_id
          and entry_date = v_check_date
      ) into v_has_entry;
      exit when not v_has_entry;
      v_streak     := v_streak + 1;
      v_check_date := v_check_date - 1;
    end loop;
  end if;

  update public.profiles
  set
    total_steps      = v_total_steps,
    streak           = v_streak,
    last_active_date = v_last_active,
    updated_at       = now()
  where id = new.user_id;

  return new;
end;
$$;

-- ============================================================
-- 2. Przelicz wszystkie istniejące profile
--    (naprawa danych zapisanych przez stary trigger)
-- ============================================================
do $$
declare
  r            record;
  v_total      bigint;
  v_streak     integer;
  v_last       date;
  v_check      date;
  v_has_entry  boolean;
begin
  for r in select id from public.profiles loop

    select coalesce(sum(daily_max), 0)
    into v_total
    from (
      select max(step_count) as daily_max
      from public.step_entries
      where user_id = r.id
      group by entry_date
    ) t;

    select max(entry_date)
    into v_last
    from public.step_entries
    where user_id = r.id;

    v_streak := 0;
    if v_last is not null and v_last >= current_date - 1 then
      v_check := v_last;
      loop
        select exists(
          select 1 from public.step_entries
          where user_id = r.id and entry_date = v_check
        ) into v_has_entry;
        exit when not v_has_entry;
        v_streak := v_streak + 1;
        v_check  := v_check - 1;
      end loop;
    end if;

    update public.profiles
    set
      total_steps      = v_total,
      streak           = v_streak,
      last_active_date = v_last,
      updated_at       = now()
    where id = r.id;

  end loop;
end $$;
