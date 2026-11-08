-- 20260413030000_seed_bob_diapers_recent — neutralised before beta (2026-11-07).
--
-- This was a one-off DEMO seed for the test account's children (Bob, Rio, Bahia). It matched
-- children by first name with no user filter and deleted/overwrote their logs, so on any new
-- database a real child with one of those names could lose data. It already ran where it was
-- meant to; it is now a no-op. The original is in git history.
SELECT 1;
