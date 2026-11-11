-- Account deletion must never be blocked by someone else's row, and its audit
-- trail must survive the deletion it records.
--
-- 1. channel_requests.resolved_by → auth.users was created without ON DELETE
--    (20260411010000) and never retrofitted (20260524000000 fixed the sibling
--    channel_system_messages.resolved_by only). A channel host who had approved
--    or denied any join request could not delete their account: deleteUser
--    failed with "Database error deleting user". → SET NULL.
--
-- 2. child_logs.logged_by → auth.users (schema.sql) has no ON DELETE either: a
--    caregiver who had logged anything for another family's child could not
--    delete their account. Environments built from migrations have no FK on
--    this column at all; only an existing constraint is changed (adding one
--    could fail on legacy rows pointing at already-deleted users). → SET NULL.
--
-- 3. account_deletion_requests.user_id → auth.users ON DELETE CASCADE deleted
--    the audit row together with the account it documents, so no completed
--    request was ever kept. The FK is dropped; user_id stays as a plain uuid.
--
-- The delete-account edge function also nulls (1) and (2) before deleting, so
-- it works before this migration ships. Idempotent; each step is skipped when
-- its table is missing.

do $$
begin
  if to_regclass('public.channel_requests') is not null then
    alter table public.channel_requests drop constraint if exists channel_requests_resolved_by_fkey;
    alter table public.channel_requests
      add constraint channel_requests_resolved_by_fkey
      foreign key (resolved_by) references auth.users(id) on delete set null;
  end if;
end $$;

do $$
begin
  if to_regclass('public.child_logs') is not null
     and exists (
       select 1 from pg_constraint
       where conname = 'child_logs_logged_by_fkey'
         and conrelid = 'public.child_logs'::regclass
     ) then
    alter table public.child_logs drop constraint child_logs_logged_by_fkey;
    alter table public.child_logs
      add constraint child_logs_logged_by_fkey
      foreign key (logged_by) references auth.users(id) on delete set null;
  end if;
end $$;

do $$
begin
  if to_regclass('public.account_deletion_requests') is not null then
    alter table public.account_deletion_requests
      drop constraint if exists account_deletion_requests_user_id_fkey;
  end if;
end $$;

notify pgrst, 'reload schema';
