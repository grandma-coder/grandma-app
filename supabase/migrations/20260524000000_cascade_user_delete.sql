-- Make `Delete user` in the Supabase dashboard actually work.
--
-- Three FKs reference auth.users / public.profiles without ON DELETE CASCADE
-- (or SET NULL). Any of them is enough to block `DELETE FROM auth.users`,
-- which is exactly what blew up on 2026-05-24 when deleting a test account
-- ("Database error deleting user"). This migration retrofits the cascades.
--
-- Safe to apply repeatedly: every DROP CONSTRAINT uses IF EXISTS and every
-- ALTER is conditional on the target table existing.

-- ─── 1. profiles.id → auth.users(id) ─────────────────────────────────────────
-- The big one. Without this cascade, deleting the auth user leaves an orphan
-- profile row that re-blocks the same delete next time.
do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles drop constraint if exists profiles_id_fkey;
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ─── 2. channels.created_by → auth.users(id) ────────────────────────────────
-- A deleted user's channels should outlive them (other members may still be
-- using the channel). SET NULL keeps the channel and clears the author.
do $$
begin
  if to_regclass('public.channels') is not null then
    alter table public.channels drop constraint if exists channels_created_by_fkey;
    alter table public.channels
      add constraint channels_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;
end $$;

-- ─── 3. channel_system_messages.resolved_by → auth.users(id) ────────────────
-- Same reasoning — keep the message, clear the resolver.
do $$
begin
  if to_regclass('public.channel_system_messages') is not null then
    alter table public.channel_system_messages
      drop constraint if exists channel_system_messages_resolved_by_fkey;
    alter table public.channel_system_messages
      add constraint channel_system_messages_resolved_by_fkey
      foreign key (resolved_by) references auth.users(id) on delete set null;
  end if;
end $$;

-- ─── 4. nanny_notes.author_id → profiles(id) ────────────────────────────────
-- Deleting an author should drop their notes (a personal log artefact, not
-- shared content). The notes already cascade away with the child via
-- child_id; this aligns user-deletion with that.
do $$
begin
  if to_regclass('public.nanny_notes') is not null then
    alter table public.nanny_notes drop constraint if exists nanny_notes_author_id_fkey;
    alter table public.nanny_notes
      add constraint nanny_notes_author_id_fkey
      foreign key (author_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

notify pgrst, 'reload schema';
