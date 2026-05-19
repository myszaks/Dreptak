-- ============================================================
-- Add slug column to challenges + fix challenge_members RLS
-- ============================================================

-- 1. Slugify helper (Polish diacritics + ASCII-safe)
create or replace function slugify(v_text text)
returns text language sql immutable as $$
  select trim(both '-' from
    regexp_replace(
      translate(lower(v_text), 'ąćęłńóśźż', 'acelnoszz'),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- 2. Unique slug generator (retries with suffix on collision)
create or replace function generate_unique_slug(p_name text, p_exclude_id uuid default null)
returns text language plpgsql as $$
declare
  base_slug text;
  candidate text;
  counter   integer := 0;
  already   boolean;
begin
  base_slug := slugify(p_name);
  if base_slug = '' then base_slug := 'wyzwanie'; end if;
  candidate := base_slug;
  loop
    select exists(
      select 1 from challenges
      where slug = candidate
        and (p_exclude_id is null or id != p_exclude_id)
    ) into already;
    exit when not already;
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
  return candidate;
end;
$$;

-- 3. Add slug column (nullable first for safe backfill)
alter table challenges add column if not exists slug text;

-- 4. Backfill existing challenges
do $$
declare
  rec record;
begin
  for rec in select id, name from challenges where slug is null or slug = '' loop
    update challenges
    set slug = generate_unique_slug(rec.name, rec.id)
    where id = rec.id;
  end loop;
end $$;

-- 5. Now enforce NOT NULL + unique constraint
alter table challenges alter column slug set not null;
alter table challenges add constraint challenges_slug_unique unique (slug);

create index if not exists idx_challenges_slug on challenges(slug);

-- 6. Auto-generate slug on INSERT when not provided
create or replace function set_challenge_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := generate_unique_slug(new.name, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists challenges_slug_before_insert on challenges;
create trigger challenges_slug_before_insert
  before insert on challenges
  for each row execute function set_challenge_slug();

-- ============================================================
-- Fix challenge_members SELECT policy
-- Allow members to see ALL members in the same challenge
-- (is_challenge_member is SECURITY DEFINER — no RLS recursion)
-- ============================================================
drop policy if exists "Members can see own memberships" on challenge_members;

create policy "Members can see own memberships" on challenge_members
  for select using (
    user_id = auth.uid()
    or is_challenge_member(challenge_id)
  );
