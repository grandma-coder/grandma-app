-- The pregnancy "Nesting", "Birth prep" and "Exam result" forms save log_type
-- 'nesting' / 'birth_prep' / 'exam_result', but the CHECK constraint (last set in
-- 20260719210000_memories_per_behavior) never listed them, so every save failed with
-- pregnancy_logs_log_type_check. Widen it, keeping the full current set.
-- drop-then-add: idempotent. Guarded by lib/__tests__/pregnancyLogTypeConstraint.test.ts.
ALTER TABLE pregnancy_logs DROP CONSTRAINT IF EXISTS pregnancy_logs_log_type_check;
ALTER TABLE pregnancy_logs
  ADD CONSTRAINT pregnancy_logs_log_type_check CHECK (log_type IN (
    'symptom', 'weight', 'kick_count', 'contraction', 'mood',
    'appointment', 'note', 'sleep', 'water', 'exercise',
    'vitamins', 'kegel', 'nutrition', 'memory',
    'nesting', 'birth_prep', 'exam_result'
  ));
