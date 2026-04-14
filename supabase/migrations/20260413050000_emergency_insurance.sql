-- Migration: Emergency contacts + insurance info per user
-- Supports the profile/emergency-insurance screen

-- 1. Emergency contacts (per user, not per child — parent's own contacts)
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text NOT NULL,  -- e.g. 'spouse', 'parent', 'sibling', 'friend', 'doctor'
  phone text NOT NULL,
  email text,
  is_primary boolean DEFAULT false,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own emergency contacts"
  ON emergency_contacts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Insurance plans (per user — family plan covers all children)
CREATE TABLE IF NOT EXISTS insurance_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL DEFAULT 'health',  -- health, dental, vision
  provider_name text NOT NULL,
  plan_name text,
  policy_number text,
  group_number text,
  member_id text,
  phone text,            -- insurance company phone
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_insurance_plans_user ON insurance_plans(user_id);

ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own insurance plans"
  ON insurance_plans FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Add emergency contact fields to profiles (quick-access primary contact)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_provider text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_policy_number text;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
