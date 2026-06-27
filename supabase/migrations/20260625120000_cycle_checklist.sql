-- 20260625120000_cycle_checklist.sql
-- Recovered from remote schema_migrations history (applied to prod 2026-06-25,
-- local file was never committed). DB side of the pre-pregnancy cycle-checklist
-- feature (item defs live in lib/cycleChecklist.ts). Reconstructed verbatim from
-- the recorded statements so local migration history matches remote.

-- cycle_checklist — per-user completion state for the pre-pregnancy checklist.
-- Item definitions live in lib/cycleChecklist.ts; this table only records which
-- item_ids a user has checked off, so progress syncs across devices.

create table if not exists cycle_checklist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  item_id     text not null,
  completed   boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, item_id)
);

alter table cycle_checklist enable row level security;

drop policy if exists "Users can manage own cycle_checklist" on cycle_checklist;

create policy "Users can manage own cycle_checklist"
  on cycle_checklist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_cycle_checklist_user on cycle_checklist(user_id);

notify pgrst, 'reload schema';

