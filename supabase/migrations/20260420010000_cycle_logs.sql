-- cycle_logs — pre-pregnancy cycle tracking (period, ovulation, symptoms, BBT,
-- mood, intercourse, etc.). Matches the definition in supabase/schema.sql.

create table if not exists cycle_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  date          date not null,
  type          text not null check (type in (
                  'period_start', 'period_end', 'ovulation', 'symptom',
                  'basal_temp', 'intercourse', 'cervical_mucus', 'mood',
                  'energy', 'weight', 'note'
                )),
  value         text,
  notes         text,
  created_at    timestamptz default now()
);

alter table cycle_logs enable row level security;

drop policy if exists "Users can manage own cycle_logs" on cycle_logs;
create policy "Users can manage own cycle_logs"
  on cycle_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_cycle_logs_user_date on cycle_logs(user_id, date);
