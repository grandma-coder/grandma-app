-- Mode Awareness: new tables for pre-pregnancy and pregnancy tracking
-- Run this migration to enable the 3 journey modes (pre-pregnancy, pregnancy, kids)

-- Add journey_mode column to profiles
alter table profiles add column if not exists journey_mode text default 'kids';

-- Cycle tracking (pre-pregnancy mode)
create table if not exists cycle_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  log_date date not null,
  log_type text not null check (log_type in ('period_start', 'period_end', 'ovulation', 'symptom', 'basal_temp', 'intercourse')),
  value text,
  notes text,
  created_at timestamptz default now()
);

-- Pregnancy tracking
create table if not exists pregnancy_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  log_date date not null default current_date,
  log_type text not null check (log_type in ('symptom', 'weight', 'kick_count', 'contraction', 'mood', 'appointment', 'note')),
  value text,
  severity text check (severity in ('mild', 'moderate', 'strong')),
  duration_seconds int,
  notes text,
  created_at timestamptz default now()
);

-- Shared appointments (pre-pregnancy + pregnancy)
create table if not exists appointments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  appointment_date timestamptz not null,
  title text not null,
  appointment_type text check (appointment_type in ('checkup', 'bloodwork', 'ultrasound', 'glucose_test', 'fertility', 'specialist', 'other')),
  doctor_name text,
  location text,
  notes text,
  mode text not null default 'pregnancy',
  created_at timestamptz default now()
);

-- Checklist progress (pre-pregnancy)
create table if not exists checklist_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  item_id text not null,
  completed boolean default false,
  completed_at timestamptz,
  constraint unique_user_item unique (user_id, item_id)
);

-- Nanny notes (if not already created)
create table if not exists nanny_notes (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references children(id) on delete cascade not null,
  author_id uuid references profiles(id) not null,
  direction text not null check (direction in ('parent_to_nanny', 'nanny_to_parent')),
  category text check (category in ('food', 'vaccine', 'activity', 'health', 'reminder', 'general')),
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS on new tables
alter table cycle_logs enable row level security;
alter table pregnancy_logs enable row level security;
alter table appointments enable row level security;
alter table checklist_progress enable row level security;

-- RLS policies: users can only access their own data
create policy "Users can manage own cycle_logs"
  on cycle_logs for all
  using (auth.uid() = user_id);

create policy "Users can manage own pregnancy_logs"
  on pregnancy_logs for all
  using (auth.uid() = user_id);

create policy "Users can manage own appointments"
  on appointments for all
  using (auth.uid() = user_id);

create policy "Users can manage own checklist_progress"
  on checklist_progress for all
  using (auth.uid() = user_id);
