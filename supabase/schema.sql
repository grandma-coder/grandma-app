-- ============================================================================
-- grandma.app — Complete Supabase Schema
-- Stack: React Native + Expo Router + TypeScript + NativeWind
-- Backend: Supabase
--
-- Run this file once to set up the full database.
-- All tables have RLS enabled with row-level policies.
-- ============================================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─── PROFILES ───────────────────────────────────────────────────────────────
-- One profile per authenticated user. Stores personal + health info.

create table if not exists profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null unique,
  name          text,
  dob           date,
  photo_url     text,
  location      text,
  language      text default 'en',
  health_notes  text,
  allergies     text[] default '{}',
  conditions    text[] default '{}',
  medications   text[] default '{}',
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = user_id);

-- ─── BEHAVIORS ──────────────────────────────────────────────────────────────
-- Tracks which journey mode(s) a user has activated.
-- A user may have multiple behaviors but only one active at a time.

create table if not exists behaviors (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  type          text not null check (type in ('cycle', 'pregnancy', 'kids')),
  active        boolean default true,
  created_at    timestamptz default now()
);

alter table behaviors enable row level security;

create policy "Users can manage own behaviors"
  on behaviors for all
  using (auth.uid() = user_id);

-- ─── CYCLE LOGS ─────────────────────────────────────────────────────────────
-- Pre-pregnancy cycle tracking: period, ovulation, symptoms, basal temp, etc.

create table if not exists cycle_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  date          date not null,
  type          text not null check (type in (
                  'period_start', 'period_end', 'ovulation', 'symptom',
                  'basal_temp', 'intercourse', 'cervical_mucus', 'mood',
                  'energy', 'weight', 'note'
                )),
  value         text,          -- temperature, symptom name, cm type, etc.
  notes         text,
  created_at    timestamptz default now()
);

alter table cycle_logs enable row level security;

create policy "Users can manage own cycle_logs"
  on cycle_logs for all
  using (auth.uid() = user_id);

-- ─── PREGNANCY LOGS ─────────────────────────────────────────────────────────
-- Pregnancy tracking: symptoms, weight, kicks, contractions, appointments.

create table if not exists pregnancy_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  date          date not null default current_date,
  type          text not null check (type in (
                  'symptom', 'weight', 'kick_count', 'contraction',
                  'mood', 'appointment', 'note', 'blood_pressure',
                  'belly_photo', 'ultrasound'
                )),
  value         text,          -- weight in kg, kick count, symptom name, etc.
  notes         text,
  created_at    timestamptz default now()
);

alter table pregnancy_logs enable row level security;

create policy "Users can manage own pregnancy_logs"
  on pregnancy_logs for all
  using (auth.uid() = user_id);

-- ─── CHILDREN ───────────────────────────────────────────────────────────────
-- Child profiles created by the parent.

create table if not exists children (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  nickname      text,
  dob           date,
  photo_url     text,
  sex           text check (sex in ('male', 'female', 'other')),
  blood_type    text,
  allergies     text[] default '{}',
  conditions    text[] default '{}',
  medications   text[] default '{}',
  pediatrician  jsonb,         -- { name, phone, clinic, notes }
  created_at    timestamptz default now()
);

alter table children enable row level security;

-- Owner can do everything
create policy "Owner can manage own children"
  on children for all
  using (auth.uid() = user_id);

-- Care circle members can read children they have access to
create policy "Care circle members can read granted children"
  on children for select
  using (
    id in (
      select unnest(children_access)
      from care_circle
      where member_user_id = auth.uid()
        and status = 'accepted'
    )
  );

-- ─── CHILD LOGS ─────────────────────────────────────────────────────────────
-- Activity logs for a child: feeding, sleep, diaper, mood, growth, etc.
-- Can be logged by the parent or any care circle member with permission.

create table if not exists child_logs (
  id            uuid primary key default uuid_generate_v4(),
  child_id      uuid references children(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,  -- child owner
  date          date not null default current_date,
  type          text not null check (type in (
                  'feeding', 'sleep', 'diaper', 'mood', 'growth',
                  'medicine', 'vaccine', 'milestone', 'temperature',
                  'food', 'note', 'photo'
                )),
  value         text,          -- amount, duration, description, etc.
  photos        text[] default '{}',
  notes         text,
  logged_by     uuid references auth.users(id),  -- who actually logged it
  created_at    timestamptz default now()
);

alter table child_logs enable row level security;

-- Owner can do everything with their child's logs
create policy "Owner can manage own child_logs"
  on child_logs for all
  using (auth.uid() = user_id);

-- Care circle members can read logs for children they have access to
create policy "Care circle can read child_logs"
  on child_logs for select
  using (
    child_id in (
      select unnest(children_access)
      from care_circle
      where member_user_id = auth.uid()
        and status = 'accepted'
    )
  );

-- Care circle members with log_activity permission can insert logs
create policy "Care circle can insert child_logs"
  on child_logs for insert
  with check (
    child_id in (
      select unnest(children_access)
      from care_circle
      where member_user_id = auth.uid()
        and status = 'accepted'
        and 'log_activity' = any(permissions)
    )
  );

-- ─── CARE CIRCLE ────────────────────────────────────────────────────────────
-- Manages access between parents and caregivers (nanny, family, partner).

create table if not exists care_circle (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid references auth.users(id) on delete cascade not null,
  member_user_id  uuid references auth.users(id) on delete cascade,  -- null until invite accepted
  role            text not null check (role in ('partner', 'nanny', 'family', 'doctor')),
  permissions     text[] default '{"view"}' check (
                    permissions <@ array['view', 'log_activity', 'chat', 'edit_child', 'emergency']::text[]
                  ),
  children_access uuid[] default '{}',  -- which children this member can access
  access_type     text default 'permanent' check (access_type in ('permanent', 'temporary', 'scheduled')),
  access_end      timestamptz,           -- for temporary access
  status          text default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invite_email    text,                  -- email used for invite (before user_id is known)
  invite_token    text unique,           -- unique token for invite link
  created_at      timestamptz default now()
);

alter table care_circle enable row level security;

-- Owner can manage their care circle
create policy "Owner can manage care_circle"
  on care_circle for all
  using (auth.uid() = owner_id);

-- Members can read their own membership
create policy "Members can read own care_circle entry"
  on care_circle for select
  using (auth.uid() = member_user_id);

-- Members can update their own entry (to accept invite)
create policy "Members can accept invite"
  on care_circle for update
  using (auth.uid() = member_user_id)
  with check (auth.uid() = member_user_id);

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
-- Push notification records + in-app notification center.

create table if not exists notifications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  type          text not null check (type in (
                  'care_circle_invite', 'care_circle_accepted',
                  'child_log', 'reminder', 'milestone',
                  'cycle_prediction', 'pregnancy_week',
                  'appointment', 'system', 'chat'
                )),
  title         text not null,
  body          text,
  read          boolean default false,
  data          jsonb default '{}',     -- arbitrary payload (screen to navigate to, etc.)
  created_at    timestamptz default now()
);

alter table notifications enable row level security;

create policy "Users can read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- System can insert notifications for any user (via service role key)
create policy "Service can insert notifications"
  on notifications for insert
  with check (true);  -- Only callable via service_role key from edge functions

-- ─── INDEXES ────────────────────────────────────────────────────────────────

create index if not exists idx_profiles_user_id on profiles(user_id);
create index if not exists idx_behaviors_user_id on behaviors(user_id);
create index if not exists idx_cycle_logs_user_date on cycle_logs(user_id, date);
create index if not exists idx_pregnancy_logs_user_date on pregnancy_logs(user_id, date);
create index if not exists idx_children_user_id on children(user_id);
create index if not exists idx_child_logs_child_date on child_logs(child_id, date);
create index if not exists idx_child_logs_user_id on child_logs(user_id);
create index if not exists idx_care_circle_owner on care_circle(owner_id);
create index if not exists idx_care_circle_member on care_circle(member_user_id);
create index if not exists idx_care_circle_token on care_circle(invite_token);
create index if not exists idx_notifications_user_read on notifications(user_id, read);
