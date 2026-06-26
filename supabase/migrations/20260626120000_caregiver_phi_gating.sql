-- U3 — Close the PHI leak in the boot children load.
--
-- Problem: the boot query embeds `children(*)` through the child_caregivers
-- join (app/_layout.tsx). RLS is row-level and cannot strip columns from a
-- SELECT, so every accepted caregiver receives the child's full row —
-- including blood_type / conditions / medications / allergies / pediatrician —
-- regardless of whether the owner granted the `emergency` capability. This
-- violates R3 ("withheld capability genuinely inaccessible at the data layer").
--
-- Fix: a SECURITY DEFINER function that returns each of the caller's accepted
-- children with the sensitive PHI columns masked (NULL / empty) unless the
-- caller is the child's parent OR holds emergency / edit_child for that child.
-- The boot path calls this RPC instead of embedding children(*). The existing
-- row-level RLS on `children` stays as the table guard for every other reader;
-- this function only changes the column projection the caregiver boot receives.
--
-- The function is SECURITY DEFINER so it can read the full row to decide what
-- to mask, but it is scoped strictly to `auth.uid()` internally — a caller can
-- only ever retrieve their own caregiver links, never another user's.

CREATE OR REPLACE FUNCTION get_caregiver_children()
RETURNS TABLE (
  role            caregiver_role,
  permissions     jsonb,
  id              uuid,
  parent_id       uuid,
  name            text,
  birth_date      date,
  weight_kg       numeric,
  height_cm       numeric,
  sex             text,
  dietary_restrictions text[],
  preferred_foods text[],
  disliked_foods  text[],
  notes           text,
  country_code    text,
  photo_url       text,
  -- Sensitive PHI — NULL/empty unless the caller may view medical for this child.
  blood_type      text,
  conditions      text[],
  medications     text[],
  allergies       text[],
  pediatrician    jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    cc.role,
    cc.permissions,
    c.id,
    c.parent_id,
    c.name,
    c.birth_date,
    c.weight_kg,
    c.height_cm,
    c.sex,
    c.dietary_restrictions,
    c.preferred_foods,
    c.disliked_foods,
    c.notes,
    c.country_code,
    c.photo_url,
    -- Medical visibility: parent of the child, OR caregiver granted emergency
    -- or edit_child. Otherwise the column is masked. `_paused` caregivers and
    -- non-accepted links are filtered out entirely by the WHERE clause below.
    CASE WHEN can_view_phi THEN c.blood_type   ELSE NULL END,
    CASE WHEN can_view_phi THEN c.conditions    ELSE '{}'::text[] END,
    CASE WHEN can_view_phi THEN c.medications   ELSE '{}'::text[] END,
    CASE WHEN can_view_phi THEN c.allergies     ELSE '{}'::text[] END,
    CASE WHEN can_view_phi THEN c.pediatrician  ELSE NULL END
  FROM child_caregivers cc
  JOIN children c ON c.id = cc.child_id
  CROSS JOIN LATERAL (
    SELECT (
      c.parent_id = auth.uid()
      OR (cc.permissions->>'emergency')::boolean = true
      OR (cc.permissions->>'edit_child')::boolean = true
    ) AS can_view_phi
  ) v
  WHERE cc.user_id = auth.uid()
    AND cc.status = 'accepted'
    AND COALESCE(cc.is_locked, false) = false
    AND COALESCE((cc.permissions->>'_paused')::boolean, false) = false;
$$;

REVOKE ALL ON FUNCTION get_caregiver_children() FROM public;
GRANT EXECUTE ON FUNCTION get_caregiver_children() TO authenticated;

NOTIFY pgrst, 'reload schema';
