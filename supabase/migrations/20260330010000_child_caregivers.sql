-- Migration: Add caregiver/nanny invite system
-- Run this in Supabase SQL Editor

-- 1. Create enums
create type caregiver_role as enum ('parent', 'nanny', 'family');
create type invite_status as enum ('pending', 'accepted', 'revoked');

-- 2. Add user_role to profiles
alter table profiles add column if not exists user_role text not null default 'parent';

-- 3. Create child_caregivers junction table
create table child_caregivers (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references children(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade,
  email text not null,
  role caregiver_role not null default 'nanny',
  status invite_status not null default 'pending',
  permissions jsonb not null default '{"view":true,"log_activity":true,"chat":true}'::jsonb,
  invite_token uuid default gen_random_uuid(),
  invited_by uuid references profiles(id) not null,
  created_at timestamptz default now(),
  accepted_at timestamptz,
  constraint unique_child_email unique (child_id, email)
);

create index idx_child_caregivers_user on child_caregivers(user_id);
create index idx_child_caregivers_email on child_caregivers(email);
create index idx_child_caregivers_token on child_caregivers(invite_token);

-- 4. Enable RLS
alter table child_caregivers enable row level security;

-- 5. RLS policies for child_caregivers
create policy "Users can view their own caregiver links"
  on child_caregivers for select
  using (user_id = auth.uid() or invited_by = auth.uid());

create policy "Parents can create invites for their children"
  on child_caregivers for insert
  with check (
    invited_by = auth.uid()
    and child_id in (select id from children where parent_id = auth.uid())
  );

create policy "Parents can update invites they created"
  on child_caregivers for update
  using (invited_by = auth.uid() or email = (select email from auth.users where id = auth.uid()));

create policy "Parents can delete invites they created"
  on child_caregivers for delete
  using (invited_by = auth.uid());

-- 6. Update existing RLS policies to allow caregiver access
-- Children: caregivers can view
drop policy if exists "own children" on children;
create policy "own or caregiver children" on children for select
  using (
    parent_id = auth.uid()
    or id in (select child_id from child_caregivers where user_id = auth.uid() and status = 'accepted')
  );

create policy "parents can insert children" on children for insert
  with check (parent_id = auth.uid());

create policy "parents can update children" on children for update
  using (parent_id = auth.uid());

-- Chat messages: caregivers with chat permission can view and insert
drop policy if exists "own messages" on chat_messages;
create policy "own or caregiver messages" on chat_messages for select
  using (
    child_id in (select child_id from child_caregivers where user_id = auth.uid() and status = 'accepted')
  );

create policy "insert messages" on chat_messages for insert
  with check (
    child_id in (
      select child_id from child_caregivers
      where user_id = auth.uid() and status = 'accepted'
      and (permissions->>'chat')::boolean = true
    )
  );

-- Scan history: caregivers can view
drop policy if exists "own scans" on scan_history;
create policy "own or caregiver scans" on scan_history for select
  using (
    child_id in (select child_id from child_caregivers where user_id = auth.uid() and status = 'accepted')
  );

create policy "insert scans" on scan_history for insert
  with check (
    child_id in (select child_id from child_caregivers where user_id = auth.uid() and status = 'accepted')
  );

-- 7. Backfill existing parents into child_caregivers
insert into child_caregivers (child_id, user_id, email, role, status, invited_by, accepted_at)
select c.id, c.parent_id, p.email, 'parent', 'accepted', c.parent_id, now()
from children c join profiles p on p.id = c.parent_id
on conflict (child_id, email) do nothing;
