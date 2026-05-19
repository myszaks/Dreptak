-- Migration: Push notification infrastructure
-- Adds push_tokens table + deep_link/metadata_json to notifications

-- ========================================
-- push_tokens table
-- ========================================
create table if not exists push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('web', 'ios', 'android')),
  device_name text,
  last_used_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint push_tokens_user_token_unique unique (user_id, token)
);

-- Indexes
create index if not exists idx_push_tokens_user_id on push_tokens(user_id);
create index if not exists idx_push_tokens_token   on push_tokens(token);

-- RLS
alter table push_tokens enable row level security;

create policy "Users manage own push tokens"
  on push_tokens for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========================================
-- Update notifications table
-- ========================================
alter table notifications
  add column if not exists deep_link     text,
  add column if not exists metadata_json jsonb;

-- Index for fast unread count lookups
create index if not exists idx_notifications_unread
  on notifications(user_id, read)
  where not read;

-- ========================================
-- Cleanup policy: auto-delete notifications older than 90 days
-- (run this manually or via pg_cron if enabled)
-- ========================================
-- select cron.schedule('cleanup-old-notifications', '0 3 * * *',
--   $$ delete from notifications where created_at < now() - interval '90 days' $$
-- );

-- ========================================
-- Cleanup policy: auto-delete stale push tokens (unused for 30 days)
-- ========================================
-- select cron.schedule('cleanup-stale-tokens', '0 4 * * *',
--   $$ delete from push_tokens where last_used_at < now() - interval '30 days' $$
-- );
