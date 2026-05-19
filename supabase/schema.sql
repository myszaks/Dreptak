-- ============================================================
-- DREPTAK - Full Supabase Schema
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  total_steps bigint not null default 0,
  streak integer not null default 0,
  last_active_date date,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_username on profiles using gin (username gin_trgm_ops);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
create table achievements (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  title text not null,
  description text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);

create index idx_user_achievements_user_id on user_achievements(user_id);

-- ============================================================
-- CHALLENGES
-- ============================================================
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null default '',
  description text,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 8)),
  icon text default '🏃',
  start_date date not null,
  end_date date not null,
  is_public boolean not null default false,
  janusz_mode boolean not null default false,
  janusz_penalty_text text,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_dates check (end_date > start_date)
);

create index idx_challenges_invite_code on challenges(invite_code);
create index idx_challenges_created_by on challenges(created_by);
create index idx_challenges_dates on challenges(start_date, end_date);
create index idx_challenges_slug on challenges(slug);

-- ============================================================
-- CHALLENGE MEMBERS
-- ============================================================
create table challenge_members (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique(challenge_id, user_id)
);

create index idx_challenge_members_challenge_id on challenge_members(challenge_id);
create index idx_challenge_members_user_id on challenge_members(user_id);

-- ============================================================
-- STEP ENTRIES
-- ============================================================
create table step_entries (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  step_count integer not null check (step_count >= 0 and step_count <= 100000),
  screenshot_url text,
  ocr_confidence real,
  ocr_raw_text text,
  is_edited boolean not null default false,
  edit_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(challenge_id, user_id, entry_date)
);

create index idx_step_entries_challenge_date on step_entries(challenge_id, entry_date);
create index idx_step_entries_user_id on step_entries(user_id);
create index idx_step_entries_entry_date on step_entries(entry_date);

-- ============================================================
-- REACTIONS
-- ============================================================
create table reactions (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references step_entries(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '💀', '🐌', '🤡', '👑')),
  created_at timestamptz not null default now(),
  unique(entry_id, user_id, emoji)
);

create index idx_reactions_entry_id on reactions(entry_id);

-- ============================================================
-- ACTIVITY FEED
-- ============================================================
create table activity_feed (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  type text not null check (type in (
    'step_entry', 'reaction', 'member_joined', 'leaderboard_change',
    'roast', 'achievement', 'challenge_started', 'challenge_ended'
  )),
  actor_id uuid references profiles(id) on delete set null,
  target_user_id uuid references profiles(id) on delete set null,
  entry_id uuid references step_entries(id) on delete cascade,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_feed_challenge_id on activity_feed(challenge_id, created_at desc);
create index idx_activity_feed_actor_id on activity_feed(actor_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in (
    'overtaken', 'podium_close', 'challenge_invite', 'daily_reminder',
    'challenge_ending', 'achievement_unlocked', 'reaction_received',
    'challenge_started', 'challenge_ended'
  )),
  title text not null,
  body text not null,
  read boolean not null default false,
  challenge_id uuid references challenges(id) on delete cascade,
  entry_id uuid references step_entries(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on notifications(user_id, read, created_at desc);

-- ============================================================
-- JANUSZ PUNISHMENTS
-- ============================================================
create table janusz_punishments (
  id uuid primary key default uuid_generate_v4(),
  text text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table challenge_punishment_votes (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  punishment_id uuid not null references janusz_punishments(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(challenge_id, voter_id)
);

create index idx_challenge_punishment_votes_challenge on challenge_punishment_votes(challenge_id);

-- ============================================================
-- VIEWS
-- ============================================================

-- Daily leaderboard view
create or replace view daily_leaderboard as
select
  se.challenge_id,
  se.entry_date,
  se.user_id,
  p.username,
  p.avatar_url,
  se.step_count,
  rank() over (
    partition by se.challenge_id, se.entry_date
    order by se.step_count desc
  ) as rank,
  se.id as entry_id
from step_entries se
join profiles p on p.id = se.user_id;

-- Full challenge leaderboard view
create or replace view challenge_leaderboard as
select
  se.challenge_id,
  se.user_id,
  p.username,
  p.avatar_url,
  sum(se.step_count) as total_steps,
  count(se.id) as days_submitted,
  max(se.step_count) as best_day,
  avg(se.step_count)::integer as avg_steps,
  rank() over (
    partition by se.challenge_id
    order by sum(se.step_count) desc
  ) as rank
from step_entries se
join profiles p on p.id = se.user_id
group by se.challenge_id, se.user_id, p.username, p.avatar_url;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger challenges_updated_at before update on challenges
  for each row execute function update_updated_at();
create trigger step_entries_updated_at before update on step_entries
  for each row execute function update_updated_at();

-- Update profile total steps and streak when step entry is added/updated
create or replace function sync_profile_total_steps()
returns trigger language plpgsql security definer as $$
declare
  v_total_steps  bigint;
  v_streak       integer;
  v_last_active  date;
  v_check_date   date;
  v_has_entry    boolean;
begin
  -- total_steps: one step_count per day (MAX across challenges for same day)
  select coalesce(sum(daily_max), 0)
  into v_total_steps
  from (
    select max(step_count) as daily_max
    from step_entries
    where user_id = new.user_id
    group by entry_date
  ) t;

  -- Last active date
  select max(entry_date)
  into v_last_active
  from step_entries
  where user_id = new.user_id;

  -- Streak: consecutive days ending on today or yesterday
  v_streak := 0;
  if v_last_active is not null
     and v_last_active >= current_date - 1 then
    v_check_date := v_last_active;
    loop
      select exists(
        select 1 from step_entries
        where user_id = new.user_id and entry_date = v_check_date
      ) into v_has_entry;
      exit when not v_has_entry;
      v_streak     := v_streak + 1;
      v_check_date := v_check_date - 1;
    end loop;
  end if;

  update profiles
  set
    total_steps      = v_total_steps,
    streak           = v_streak,
    last_active_date = v_last_active,
    updated_at       = now()
  where id = new.user_id;

  return new;
end;
$$;

create trigger sync_steps_on_entry after insert or update on step_entries
  for each row execute function sync_profile_total_steps();

-- Generate invite code
create or replace function generate_invite_code()
returns text language plpgsql as $$
declare
  code text;
  exists boolean;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    select exists(select 1 from challenges where invite_code = code) into exists;
    exit when not exists;
  end loop;
  return code;
end;
$$;

-- Get challenge stats
create or replace function get_challenge_stats(p_challenge_id uuid)
returns json language plpgsql stable security definer as $$
declare
  result json;
begin
  select json_build_object(
    'member_count', (select count(*) from challenge_members where challenge_id = p_challenge_id),
    'total_entries', (select count(*) from step_entries where challenge_id = p_challenge_id),
    'total_steps', (select coalesce(sum(step_count), 0) from step_entries where challenge_id = p_challenge_id),
    'avg_daily_steps', (
      select coalesce(avg(daily_total), 0)::integer
      from (
        select entry_date, sum(step_count) as daily_total
        from step_entries
        where challenge_id = p_challenge_id
        group by entry_date
      ) daily
    )
  ) into result;
  return result;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table challenges enable row level security;
alter table challenge_members enable row level security;
alter table step_entries enable row level security;
alter table reactions enable row level security;
alter table activity_feed enable row level security;
alter table notifications enable row level security;
alter table janusz_punishments enable row level security;
alter table challenge_punishment_votes enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Achievements policies
create policy "Anyone can view achievements" on achievements
  for select using (true);

-- User achievements policies
create policy "User achievements viewable by everyone" on user_achievements
  for select using (true);
create policy "System can insert user achievements" on user_achievements
  for insert with check (auth.uid() = user_id);

-- Slugify: Polish diacritics → ASCII, spaces → dashes
create or replace function slugify(v_text text)
returns text language sql immutable as $$
  select trim(both '-' from
    regexp_replace(
      translate(lower(v_text), 'ąćęłńóśźż', 'acelnoszz'),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- Unique slug generator
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

-- Auto-set slug before insert
create or replace function set_challenge_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := generate_unique_slug(new.name, new.id);
  end if;
  return new;
end;
$$;

create trigger challenges_slug_before_insert
  before insert on challenges
  for each row execute function set_challenge_slug();

-- Helper: check membership without triggering RLS (security definer bypasses row-level policies)
create or replace function is_challenge_member(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from challenge_members
    where challenge_id = p_challenge_id
      and user_id = auth.uid()
  );
$$;

-- Challenges policies
create policy "Public challenges viewable by everyone" on challenges
  for select using (
    is_public = true
    or created_by = auth.uid()
    or is_challenge_member(id)
  );
create policy "Authenticated users can create challenges" on challenges
  for insert with check (auth.uid() = created_by);
create policy "Challenge admins can update" on challenges
  for update using (
    auth.uid() = created_by or is_challenge_member(id)
  );

-- Challenge members policies
-- Deliberately simple (user_id = auth.uid()) to avoid self-referential recursion
-- Members can see all other members in the same challenge
-- (is_challenge_member is SECURITY DEFINER — no RLS recursion)
create policy "Members can see own memberships" on challenge_members
  for select using (
    user_id = auth.uid()
    or is_challenge_member(challenge_id)
  );
create policy "Users can join challenges" on challenge_members
  for insert with check (auth.uid() = user_id);
create policy "Users can leave challenges" on challenge_members
  for delete using (auth.uid() = user_id);

-- Step entries policies
create policy "Step entries viewable by challenge members" on step_entries
  for select using (
    is_challenge_member(challenge_id)
  );
create policy "Users can insert own step entries" on step_entries
  for insert with check (auth.uid() = user_id);
create policy "Users can update own entries within edit window" on step_entries
  for update using (
    auth.uid() = user_id and
    (edit_expires_at is null or edit_expires_at > now())
  );

-- Reactions policies
create policy "Reactions viewable by challenge members" on reactions
  for select using (
    exists (
      select 1 from step_entries se
      where se.id = entry_id and is_challenge_member(se.challenge_id)
    )
  );
create policy "Challenge members can react" on reactions
  for insert with check (auth.uid() = user_id);
create policy "Users can remove own reactions" on reactions
  for delete using (auth.uid() = user_id);

-- Activity feed policies
create policy "Feed viewable by challenge members" on activity_feed
  for select using (
    is_challenge_member(challenge_id)
  );
create policy "System can insert feed items" on activity_feed
  for insert with check (auth.uid() = actor_id);

-- Notifications policies
create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = user_id);

-- Janusz punishments policies
create policy "Anyone can view punishments" on janusz_punishments
  for select using (true);

-- Challenge punishment votes policies
create policy "Challenge members can view votes" on challenge_punishment_votes
  for select using (
    is_challenge_member(challenge_id)
  );
create policy "Challenge members can vote" on challenge_punishment_votes
  for insert with check (auth.uid() = voter_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Achievements
insert into achievements (code, title, description, icon) values
  ('krokomistrzs', 'Krokomistrz', 'Zrób 10,000 kroków w ciągu jednego dnia', '👑'),
  ('krol_zabki', 'Król Żabki', 'Przeżyj tydzień bez wyjścia powyżej 2000 kroków', '🐸'),
  ('nocny_spacerowicz', 'Nocny spacerowicz', 'Zrób 8000+ kroków po godzinie 22:00', '🌙'),
  ('czlowiek_gps', 'Człowiek GPS', 'Nie opuść ani jednego dnia przez 7 dni', '📡'),
  ('zwyciezca', 'Zwycięzca', 'Wygraj challenge', '🏆'),
  ('janusz', 'Janusz', 'Zajmij ostatnie miejsce w challenge', '😅'),
  ('pierwszy_krok', 'Pierwszy krok', 'Dodaj pierwszą aktywność', '👟'),
  ('maraton', 'Maratończyk', 'Łącznie pokonaj 100,000 kroków', '🏅')
on conflict (code) do nothing;

-- Janusz punishments
insert into janusz_punishments (text) values
  ('Kupuje kebsa zwycięzcy 🥙'),
  ('Stawia kawę całej grupie ☕'),
  ('Wrzuca cringe selfie na grupkę 🤳'),
  ('Myje auto zwycięzcy 🚗'),
  ('Gotuje obiad dla całej grupy 🍳'),
  ('Robi 100 pompek na żywo 💪'),
  ('Śpiewa karaoke na następnym spotkaniu 🎤'),
  ('Płaci za pizzę na game night 🍕'),
  ('Przez tydzień jest dostępny 24/7 jako chłopiec na posyłki 📦'),
  ('Tańczy TikToka i wysyła na grupkę 💃')
on conflict do nothing;
