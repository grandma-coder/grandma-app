-- Extend pregnancy_logs to support all log types
-- Drop the restrictive log_type CHECK constraint
ALTER TABLE pregnancy_logs DROP CONSTRAINT IF EXISTS pregnancy_logs_log_type_check;
