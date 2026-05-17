-- Backfill `child_caregivers` rows for parents whose children were created
-- before onboarding/kids/index.tsx was updated to insert the caregiver link.
--
-- Symptom: app/_layout.tsx logs `child_caregivers found: 0` even though the
-- user has children, and the boot path has to fall back to a direct query on
-- `children` by `parent_id`. The fallback works but the care-circle screen,
-- permission checks, and "invite caregiver" all read child_caregivers and
-- show empty / broken for those legacy accounts.
--
-- Two repairs run in order:
--
-- 1. UPDATE any pre-existing row where (child_id, parent_email) already
--    exists but user_id is NULL or wrong (a pending invite was created
--    using the parent's own email and never linked back to the parent's
--    user_id). Promote it to a proper 'parent' link.
--
-- 2. INSERT missing links for children with no matching row at all.
--
-- The unique constraint on child_caregivers is (child_id, email) — NOT
-- (child_id, user_id) — so an INSERT-only approach hits 23505 when a
-- legacy invite row already occupies the (child_id, parent_email) slot.

-- ─── Step 1: promote orphan invite rows to proper parent links ────────────

UPDATE child_caregivers cc
SET
  user_id     = c.parent_id,
  role        = 'parent',
  status      = 'accepted',
  permissions = jsonb_build_object(
    'view',         true,
    'log_activity', true,
    'chat',         true,
    'edit_child',   true,
    'emergency',    true
  ),
  invited_by  = c.parent_id,
  accepted_at = COALESCE(cc.accepted_at, now())
FROM children c
JOIN auth.users u ON u.id = c.parent_id
WHERE cc.child_id = c.id
  AND cc.email = u.email
  AND (cc.user_id IS DISTINCT FROM c.parent_id OR cc.role <> 'parent' OR cc.status <> 'accepted');

-- ─── Step 2: insert links for children that have no row at all ────────────

INSERT INTO child_caregivers (
  child_id,
  user_id,
  email,
  role,
  status,
  permissions,
  invited_by,
  accepted_at
)
SELECT
  c.id              AS child_id,
  c.parent_id       AS user_id,
  COALESCE(u.email, '') AS email,
  'parent'          AS role,
  'accepted'        AS status,
  jsonb_build_object(
    'view',         true,
    'log_activity', true,
    'chat',         true,
    'edit_child',   true,
    'emergency',    true
  )                 AS permissions,
  c.parent_id       AS invited_by,
  COALESCE(c.created_at, now()) AS accepted_at
FROM children c
JOIN auth.users u ON u.id = c.parent_id
WHERE c.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM child_caregivers cc
    WHERE cc.child_id = c.id
      AND (cc.user_id = c.parent_id OR cc.email = u.email)
  );

NOTIFY pgrst, 'reload schema';
