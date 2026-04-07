-- Fix RLS policies for child_caregivers

-- Fix INSERT: just check invited_by matches current user
DROP POLICY IF EXISTS "Parents can create invites for their children" ON child_caregivers;
CREATE POLICY "Parents can create invites"
  ON child_caregivers FOR INSERT
  WITH CHECK (invited_by = auth.uid());

-- Fix SELECT: don't reference auth.users (permission denied)
DROP POLICY IF EXISTS "Users can view their own caregiver links" ON child_caregivers;
DROP POLICY IF EXISTS "Users can view caregiver links" ON child_caregivers;
CREATE POLICY "Users can view caregiver links"
  ON child_caregivers FOR SELECT
  USING (user_id = auth.uid() OR invited_by = auth.uid());

NOTIFY pgrst, 'reload schema';
