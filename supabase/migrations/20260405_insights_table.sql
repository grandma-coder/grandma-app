-- ─── INSIGHTS TABLE ─────────────────────────────────────────────────────────
-- AI-generated insights from user logs. Generated daily or on-demand.
-- Types: pattern, trend, upcoming, nudge

create table if not exists insights (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  type          text not null check (type in ('pattern', 'trend', 'upcoming', 'nudge')),
  title         text not null,
  body          text not null,
  behavior      text not null check (behavior in ('pre-pregnancy', 'pregnancy', 'kids')),
  child_id      uuid references children(id) on delete cascade,  -- null for non-kids insights
  archived      boolean default false,
  archived_at   timestamptz,
  created_at    timestamptz default now()
);

alter table insights enable row level security;

create policy "Users can read own insights"
  on insights for select
  using (auth.uid() = user_id);

create policy "Users can update own insights"
  on insights for update
  using (auth.uid() = user_id);

-- Service role can insert (from edge function)
create policy "Service can insert insights"
  on insights for insert
  with check (true);

create index if not exists idx_insights_user_id on insights(user_id);
create index if not exists idx_insights_user_archived on insights(user_id, archived);
create index if not exists idx_insights_created on insights(user_id, created_at desc);
