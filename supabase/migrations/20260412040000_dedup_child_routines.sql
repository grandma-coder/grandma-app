-- Deduplicate child_routines: keep the oldest row for each (child_id, type, name) combo,
-- delete all newer duplicates. This fixes routines that were accidentally created twice
-- (e.g. Morning bottle appearing as both pending and skipped simultaneously).

DELETE FROM child_routines
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY child_id, type, name
        ORDER BY created_at ASC  -- keep the oldest
      ) AS rn
    FROM child_routines
  ) ranked
  WHERE rn > 1
);
