-- ─────────────────────────────────────────────────────────────────────────────
-- cleanup_seeded_logs.sql
--
-- One-off remediation for synthetic/seed cycle & pregnancy log rows that leaked
-- onto REAL production accounts via three now-removed / gated code paths:
--   1. CycleTodaySummaryCard auto-seed  → seedCycleData()  (removed; ~150 rows/user,
--                                          backdated ~5 months, ALWAYS notes=NULL)
--   2. Pregnancy onboarding backfill    → seedPregnancyData() from pregnancySeeds.ts
--                                          (removed; ~14 days of logs + fake appts)
--   3. Migration 20260416020000_seed_pregnancy_logs.sql (now gated; may have run
--                                          ungated historically on the OLDEST user)
--
-- ⚠️  READ THIS BEFORE RUNNING — the naive "log-dated before signup" signature is
--     NOT safe on its own. Real cycle onboarding writes ONE legitimate
--     `period_start` row backdated up to 90 days (the user's real "last period
--     date"). That row is log-dated before signup and must be PRESERVED.
--
-- SIGNATURE (cycle_logs) — a row is treated as seeded iff ALL of:
--     (a) date < users.created_at::date - 1 day   (backdated before signup, with a
--                                                   1-day grace buffer to dodge the
--                                                   UTC-truncation boundary), AND
--     (b) notes IS NULL                            (every seed row has notes=NULL;
--                                                   the real onboarding row always
--                                                   carries a notes JSON blob), AND
--     (c) it is NOT the user's earliest period_start row
--                                                  (belt-and-suspenders: that row is
--                                                   the genuine onboarding answer),
--   AND the user is only touched if they have MORE THAN 5 backdated rows
--   (real onboarding produces exactly 1; the seeder produced ~150). Users with
--   1–5 backdated rows are EXCLUDED and must be inspected by hand.
--
--   These three signals ((b) notes-null, (c) earliest-period_start exclusion,
--   volume gate) are independent — any ONE alone protects the real onboarding
--   row against every live code path today. Verified: seedCycleData is the only
--   non-onboarding writer into cycle_logs, and every form-based logging UI writes
--   a non-null notes / distinct type. If a future flow ever writes backdated
--   notes-NULL period corrections, revisit this signature before re-running.
--
-- SIGNATURE (pregnancy_logs) — pregnancy onboarding's date pickers are future-only
--   (minimumDate = now), so NO legitimate pregnancy_logs row can predate signup.
--   The plain "log_date < signup" predicate is safe there. We still apply the
--   1-day grace buffer for symmetry.
--
-- HOW TO RUN (do NOT run this file top-to-bottom in one shot):
--   Step 0  PART 1  — DIAGNOSE (read-only). Review per-user counts + the
--                     manual-inspection list in 1e.
--   Step 1  PART 2  — DRY RUN inside BEGIN…ROLLBACK. Paste the whole block at
--                     once. Confirm the RETURNING counts match PART 1.
--   Step 2  PART 3  — BACKUP + COMMIT. Uncomment and run only after 1 + 2 look
--                     right. Creates a restore table, then deletes.
-- ─────────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════
-- PART 1 — DIAGNOSTICS (read-only, safe anytime)
-- ══════════════════════════════════════════════════════════════════════════

-- Shared definition of the rows we consider seeded, expressed once as a view-like
-- CTE you can paste in front of each query below. (SQL has no persistent CTE
-- across statements, so it's repeated — keep the three predicate lines identical
-- everywhere: any edit must be mirrored in PART 2 and PART 3.)

-- 1a. Per-user suspected-seeded CYCLE rows (full signature).
WITH onboarding_row AS (
  SELECT DISTINCT ON (user_id) id
  FROM cycle_logs
  WHERE type = 'period_start'
  ORDER BY user_id, created_at ASC          -- the FIRST period_start row this user got
),
backdated AS (
  SELECT c.*, u.email, u.created_at AS acct_created
  FROM cycle_logs c
  JOIN auth.users u ON u.id = c.user_id
  WHERE c.date < u.created_at::date - INTERVAL '1 day'   -- (a) backdated + grace buffer
    AND c.notes IS NULL                                  -- (b) seed rows are notes-NULL
    AND c.id NOT IN (SELECT id FROM onboarding_row)      -- (c) never the onboarding row
)
SELECT
  b.user_id,
  b.email,
  b.acct_created::date          AS account_created,
  count(*)                      AS seeded_cycle_rows,
  min(b.date)                   AS earliest_seeded_date,
  max(b.date)                   AS latest_seeded_date
FROM backdated b
GROUP BY b.user_id, b.email, b.acct_created
HAVING count(*) > 5                                       -- volume gate: only bulk seeds
ORDER BY seeded_cycle_rows DESC;

-- 1b. Per-user suspected-seeded PREGNANCY rows (future-only onboarding → simple).
SELECT
  p.user_id,
  u.email,
  u.created_at::date            AS account_created,
  count(*)                      AS seeded_pregnancy_rows,
  min(p.log_date)               AS earliest_seeded_date,
  max(p.log_date)               AS latest_seeded_date
FROM pregnancy_logs p
JOIN auth.users u ON u.id = p.user_id
WHERE p.log_date < u.created_at::date - INTERVAL '1 day'
GROUP BY p.user_id, u.email, u.created_at
ORDER BY seeded_pregnancy_rows DESC;

-- 1c. DB-wide totals under the SAFE signatures above.
SELECT
  (
    WITH onboarding_row AS (
      SELECT DISTINCT ON (user_id) id FROM cycle_logs
      WHERE type = 'period_start' ORDER BY user_id, created_at ASC
    ),
    backdated AS (
      SELECT c.user_id
      FROM cycle_logs c JOIN auth.users u ON u.id = c.user_id
      WHERE c.date < u.created_at::date - INTERVAL '1 day'
        AND c.notes IS NULL
        AND c.id NOT IN (SELECT id FROM onboarding_row)
    ),
    bulk AS (SELECT user_id FROM backdated GROUP BY user_id HAVING count(*) > 5)
    SELECT count(*) FROM cycle_logs c
    JOIN auth.users u ON u.id = c.user_id
    WHERE c.user_id IN (SELECT user_id FROM bulk)
      AND c.date < u.created_at::date - INTERVAL '1 day'
      AND c.notes IS NULL
      AND c.id NOT IN (SELECT id FROM onboarding_row)
  ) AS total_seeded_cycle_rows,
  (
    SELECT count(*) FROM pregnancy_logs p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.log_date < u.created_at::date - INTERVAL '1 day'
  ) AS total_seeded_pregnancy_rows;

-- 1d. SAFETY CHECK — rows that SURVIVE per cycle user (the real logs we keep).
--     Confirms the legitimate onboarding period_start is retained.
WITH onboarding_row AS (
  SELECT DISTINCT ON (user_id) id FROM cycle_logs
  WHERE type = 'period_start' ORDER BY user_id, created_at ASC
)
SELECT
  c.user_id,
  count(*) FILTER (
    WHERE c.date < u.created_at::date - INTERVAL '1 day'
      AND c.notes IS NULL
      AND c.id NOT IN (SELECT id FROM onboarding_row)
  ) AS flagged_rows,
  count(*) FILTER (
    WHERE c.id IN (SELECT id FROM onboarding_row)
  ) AS onboarding_rows_kept,
  count(*) AS total_rows
FROM cycle_logs c
JOIN auth.users u ON u.id = c.user_id
GROUP BY c.user_id
ORDER BY flagged_rows DESC;

-- 1e. MANUAL-INSPECTION LIST — users with 1–5 backdated cycle rows.
--     These are EXCLUDED from the automated delete (likely genuine onboarding).
--     Eyeball them; delete by explicit id only if you confirm they're seeded.
WITH onboarding_row AS (
  SELECT DISTINCT ON (user_id) id FROM cycle_logs
  WHERE type = 'period_start' ORDER BY user_id, created_at ASC
)
SELECT c.user_id, u.email, count(*) AS backdated_rows,
       array_agg(DISTINCT c.type) AS types, min(c.date), max(c.date)
FROM cycle_logs c
JOIN auth.users u ON u.id = c.user_id
WHERE c.date < u.created_at::date - INTERVAL '1 day'
  AND c.notes IS NULL
  AND c.id NOT IN (SELECT id FROM onboarding_row)
GROUP BY c.user_id, u.email
HAVING count(*) BETWEEN 1 AND 5
ORDER BY backdated_rows;


-- ══════════════════════════════════════════════════════════════════════════
-- PART 2 — DRY RUN (single transaction, always ROLLBACKs). Paste as ONE block.
-- ══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Cycle: delete only bulk-seeded backdated notes-NULL non-onboarding rows.
WITH onboarding_row AS (
  SELECT DISTINCT ON (user_id) id FROM cycle_logs
  WHERE type = 'period_start' ORDER BY user_id, created_at ASC
),
bulk_users AS (
  SELECT c.user_id
  FROM cycle_logs c JOIN auth.users u ON u.id = c.user_id
  WHERE c.date < u.created_at::date - INTERVAL '1 day'
    AND c.notes IS NULL
    AND c.id NOT IN (SELECT id FROM onboarding_row)
  GROUP BY c.user_id HAVING count(*) > 5
),
removed_cycle AS (
  DELETE FROM cycle_logs c
  USING auth.users u
  WHERE u.id = c.user_id
    AND c.user_id IN (SELECT user_id FROM bulk_users)
    AND c.date < u.created_at::date - INTERVAL '1 day'
    AND c.notes IS NULL
    AND c.id NOT IN (SELECT id FROM onboarding_row)
  RETURNING c.id
)
SELECT count(*) AS would_delete_cycle_rows FROM removed_cycle;

-- Pregnancy: future-only onboarding → plain predicate is safe.
WITH removed_preg AS (
  DELETE FROM pregnancy_logs p
  USING auth.users u
  WHERE u.id = p.user_id
    AND p.log_date < u.created_at::date - INTERVAL '1 day'
  RETURNING p.id
)
SELECT count(*) AS would_delete_pregnancy_rows FROM removed_preg;

ROLLBACK;   -- ← nothing above persists. This is the dry run.


-- ══════════════════════════════════════════════════════════════════════════
-- PART 3 — BACKUP + COMMIT (the real deletion). Uncomment to run.
--          Only after PART 1 + PART 2 look correct. Run as ONE block.
-- ══════════════════════════════════════════════════════════════════════════

-- BEGIN;
--
-- -- 3a. Snapshot the exact rows about to be deleted (restore insurance).
-- --     Drop these tables once you're confident: DROP TABLE cycle_logs_seeded_backup_20260719;
-- CREATE TABLE cycle_logs_seeded_backup_20260719 AS
-- WITH onboarding_row AS (
--   SELECT DISTINCT ON (user_id) id FROM cycle_logs
--   WHERE type = 'period_start' ORDER BY user_id, created_at ASC
-- ),
-- bulk_users AS (
--   SELECT c.user_id
--   FROM cycle_logs c JOIN auth.users u ON u.id = c.user_id
--   WHERE c.date < u.created_at::date - INTERVAL '1 day'
--     AND c.notes IS NULL
--     AND c.id NOT IN (SELECT id FROM onboarding_row)
--   GROUP BY c.user_id HAVING count(*) > 5
-- )
-- SELECT c.* FROM cycle_logs c
-- WHERE c.user_id IN (SELECT user_id FROM bulk_users)
--   AND c.date < (SELECT created_at::date - INTERVAL '1 day' FROM auth.users u WHERE u.id = c.user_id)
--   AND c.notes IS NULL
--   AND c.id NOT IN (SELECT id FROM onboarding_row);
--
-- CREATE TABLE pregnancy_logs_seeded_backup_20260719 AS
-- SELECT p.* FROM pregnancy_logs p
-- JOIN auth.users u ON u.id = p.user_id
-- WHERE p.log_date < u.created_at::date - INTERVAL '1 day';
--
-- -- 3b. Delete cycle seeds (mirror of PART 2 — keep predicates identical).
-- WITH onboarding_row AS (
--   SELECT DISTINCT ON (user_id) id FROM cycle_logs
--   WHERE type = 'period_start' ORDER BY user_id, created_at ASC
-- ),
-- bulk_users AS (
--   SELECT c.user_id
--   FROM cycle_logs c JOIN auth.users u ON u.id = c.user_id
--   WHERE c.date < u.created_at::date - INTERVAL '1 day'
--     AND c.notes IS NULL
--     AND c.id NOT IN (SELECT id FROM onboarding_row)
--   GROUP BY c.user_id HAVING count(*) > 5
-- )
-- DELETE FROM cycle_logs c
-- USING auth.users u
-- WHERE u.id = c.user_id
--   AND c.user_id IN (SELECT user_id FROM bulk_users)
--   AND c.date < u.created_at::date - INTERVAL '1 day'
--   AND c.notes IS NULL
--   AND c.id NOT IN (SELECT id FROM onboarding_row);
--
-- -- 3c. Delete pregnancy seeds.
-- DELETE FROM pregnancy_logs p
-- USING auth.users u
-- WHERE u.id = p.user_id
--   AND p.log_date < u.created_at::date - INTERVAL '1 day';
--
-- -- 3d. Sanity re-check inside the txn BEFORE committing:
-- --     SELECT count(*) FROM cycle_logs_seeded_backup_20260719;      -- rows saved
-- --     SELECT count(*) FROM pregnancy_logs_seeded_backup_20260719;  -- rows saved
--
-- COMMIT;
