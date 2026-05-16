-- Ensure `care_circle` exists (defined in supabase/schema.sql but never had its
-- own migration), then add `invite_name` so onboarding can persist a partner /
-- caregiver name without needing an email yet. Previously the partner-name
-- input wrote to local Zustand only and was silently dropped on
-- store.clearAll() after onboarding completion.

-- ─── care_circle table (defensive create) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS care_circle (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role             text NOT NULL CHECK (role IN ('partner', 'nanny', 'family', 'doctor')),
  permissions      text[] DEFAULT '{"view"}' CHECK (
                     permissions <@ ARRAY['view', 'log_activity', 'chat', 'edit_child', 'emergency']::text[]
                   ),
  children_access  uuid[] DEFAULT '{}',
  access_type      text DEFAULT 'permanent' CHECK (access_type IN ('permanent', 'temporary', 'scheduled')),
  access_end       timestamptz,
  status           text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invite_email     text,
  invite_token     text UNIQUE,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE care_circle ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner can manage care_circle"
    ON care_circle FOR ALL
    USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── invite_name column ────────────────────────────────────────────────────

ALTER TABLE care_circle
  ADD COLUMN IF NOT EXISTS invite_name TEXT;

NOTIFY pgrst, 'reload schema';
