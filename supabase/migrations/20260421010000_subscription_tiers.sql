-- Subscription tiers: free | premium_solo | premium_family
-- Enforces server-side seat limits on child_caregivers

-- 1. Tier enum + column on profiles
do $$ begin
  create type subscription_tier as enum ('free', 'premium_solo', 'premium_family');
exception when duplicate_object then null; end $$;

alter table profiles
  add column if not exists subscription_tier subscription_tier not null default 'free';

-- Backfill from legacy subscription_status for any existing premium users
update profiles
set subscription_tier = 'premium_solo'
where subscription_status = 'premium' and subscription_tier = 'free';

-- 2. Seat-limit helper (owner-side count of accepted caregivers they invited)
create or replace function tier_seat_limit(tier subscription_tier)
returns int
language sql
immutable
as $$
  select case tier
    when 'free' then 0
    when 'premium_solo' then 1
    when 'premium_family' then 4
  end;
$$;

create or replace function active_seats_for(owner uuid)
returns int
language sql
stable
security definer
as $$
  select count(*)::int
  from child_caregivers
  where invited_by = owner
    and status = 'accepted'
    and coalesce(is_locked, false) = false
    and role <> 'parent';
$$;

-- 3. Read-only lock flag (set when owner downgrades past their current seat count)
alter table child_caregivers
  add column if not exists is_locked boolean not null default false;

create index if not exists idx_child_caregivers_invited_by_active
  on child_caregivers(invited_by, status) where is_locked = false;

-- 4. Replace INSERT policy on child_caregivers to enforce tier seat cap
drop policy if exists "Parents can create invites for their children" on child_caregivers;

create policy "Parents can create invites within tier limit"
  on child_caregivers for insert
  with check (
    invited_by = auth.uid()
    and child_id in (select id from children where parent_id = auth.uid())
  );

-- BEFORE INSERT trigger closes the race between policy check and commit by
-- serializing invites per owner via FOR UPDATE lock on owner's profile row.
create or replace function enforce_seat_limit_on_insert()
returns trigger
language plpgsql
security definer
as $$
declare
  owner_tier subscription_tier;
  current_count int;
begin
  if new.role = 'parent' then
    return new;
  end if;

  -- Serialize concurrent invites per owner
  select subscription_tier into owner_tier
  from profiles where id = new.invited_by
  for update;

  select count(*) into current_count
  from child_caregivers
  where invited_by = new.invited_by
    and status = 'accepted'
    and is_locked = false
    and role <> 'parent';

  if current_count >= tier_seat_limit(owner_tier) then
    raise exception 'seat_limit_exceeded' using
      errcode = 'P0001',
      hint = 'Upgrade your subscription to invite more caregivers.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_seat_limit on child_caregivers;
create trigger trg_enforce_seat_limit
  before insert on child_caregivers
  for each row execute function enforce_seat_limit_on_insert();

-- 5. Trigger: when subscription_tier is downgraded, lock newest excess caregivers read-only
create or replace function lock_excess_seats_on_downgrade()
returns trigger
language plpgsql
as $$
declare
  new_limit int := tier_seat_limit(new.subscription_tier);
  current_count int;
  to_lock int;
begin
  if new.subscription_tier = old.subscription_tier then
    return new;
  end if;

  -- Upgrade: unlock any previously locked seats up to new limit (FIFO by created_at)
  if tier_seat_limit(new.subscription_tier) > tier_seat_limit(old.subscription_tier) then
    update child_caregivers
    set is_locked = false
    where id in (
      select id from child_caregivers
      where invited_by = new.id
        and is_locked = true
        and role <> 'parent'
      order by created_at asc
      limit greatest(0, new_limit - active_seats_for(new.id))
    );
    return new;
  end if;

  -- Downgrade: lock newest accepted caregivers beyond new limit
  select count(*) into current_count
  from child_caregivers
  where invited_by = new.id
    and status = 'accepted'
    and is_locked = false
    and role <> 'parent';

  to_lock := current_count - new_limit;

  if to_lock > 0 then
    update child_caregivers
    set is_locked = true
    where id in (
      select id from child_caregivers
      where invited_by = new.id
        and status = 'accepted'
        and is_locked = false
        and role <> 'parent'
      order by accepted_at desc nulls last
      limit to_lock
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lock_excess_seats on profiles;
create trigger trg_lock_excess_seats
  after update of subscription_tier on profiles
  for each row execute function lock_excess_seats_on_downgrade();

-- 6. Locked caregivers keep SELECT but lose write access
-- child_logs: block insert when caregiver link is locked
-- Policy name matches the one created in 20260405020000_child_logs.sql (capitalized)
drop policy if exists "Insert child_logs" on child_logs;
create policy "Insert child_logs"
  on child_logs for insert
  with check (
    child_id in (
      select child_id from child_caregivers
      where user_id = auth.uid()
        and status = 'accepted'
        and is_locked = false
    )
  );

-- chat_messages: same lock gate on insert
drop policy if exists "insert messages" on chat_messages;
create policy "insert messages"
  on chat_messages for insert
  with check (
    child_id in (
      select child_id from child_caregivers
      where user_id = auth.uid()
        and status = 'accepted'
        and is_locked = false
        and (permissions->>'chat')::boolean = true
    )
  );
