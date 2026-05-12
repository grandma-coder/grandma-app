# /log-table

Add a new log type (e.g. medication, milestone, symptom) end-to-end across the data layer + UI.

## Context

Logs are written to one of three tables based on mode:
- `cycle_logs` (pre-pregnancy: period, ovulation, basal_temp, symptom)
- `pregnancy_logs` (pregnancy: symptom, weight, kick, contraction)
- `child_logs` (kids: feeding, sleep, diaper, mood, vaccine, medicine)

Each row has a `log_type` column that's a Postgres enum or text-with-check-constraint. Adding a new log type touches: migration, types, log form, dashboard display, and (sometimes) insights generation.

## Inputs

Ask the user:
1. **Which table?** `cycle_logs` | `pregnancy_logs` | `child_logs`
2. **Log type name** — snake_case (`bottle_feeding`, `tummy_time`, `headache`)
3. **Display name** — Title Case ("Bottle Feeding")
4. **Fields** — what gets logged besides timestamp + child/user? (e.g. `volume_ml`, `duration_min`, `notes`)
5. **Mode** — derived from table, confirm with user

## Steps

### 1. Migration
Create `supabase/migrations/YYYYMMDD_add_<log_type>.sql`:
```sql
-- Add new log type to the constraint/enum
ALTER TABLE <table> DROP CONSTRAINT IF EXISTS <table>_log_type_check;
ALTER TABLE <table> ADD CONSTRAINT <table>_log_type_check
  CHECK (log_type IN ('existing_type_1', ..., '<new_type>'));

-- If new fields are needed, add them as JSONB on the existing data column,
-- OR add explicit columns if the field is queried frequently
```

Use `YYYYMMDD` from `date +%Y%m%d`. Read existing migrations to understand the prevailing style — `IF NOT EXISTS`, RLS already exists on these tables, etc.

### 2. Local date string
Use `toDateStr(new Date())` from `lib/date.ts` (or wherever the helper lives) for `log_date`. **Never** use `toISOString().split('T')[0]` — that's UTC and breaks evening logs west of UTC.

### 3. Log form
Find the form component for the target mode:
- Kids: `components/calendar/KidsLogForms.tsx`
- Pregnancy: `components/agenda/SymptomLogger.tsx` or similar
- Pre-pregnancy: `components/agenda/CycleTracker.tsx` or similar

Add a new form section / sticker for the log type. Match the existing form's pattern (haptics on submit, GlassCard wrapper, mode-colored CTA).

### 4. Dashboard tile / display
The mode's home screen will likely need to surface the new log type:
- Kids: `components/home/KidsHome.tsx` — add a tile or extend an existing one
- Pregnancy: `components/home/pregnancy/*`
- Pre-pregnancy: `components/home/prepreg/*` or `components/prepreg/*`

Only add a tile if the user explicitly asks. Otherwise just wire the data and let them place it.

### 5. Insights (optional)
If the log type should generate insights, update `supabase/functions/generate-insights/index.ts` and `lib/insights.ts` with a handler for the new type. Skip this step unless asked.

### 6. i18n
Add keys to `lib/i18n/keys.ts` + `lib/i18n/en.ts`:
- `log_<type>_name`
- `log_<type>_action` (e.g. "Log bottle feeding")
- Field labels as needed

Add English placeholders to all 11 other locale files.

## Constraints

- Don't run the migration automatically. Print the command (`supabase db push` or `supabase migration up`) and let the user run it.
- RLS already exists on these tables — don't add new policies.
- Don't add columns to the table if a JSONB blob already exists for arbitrary fields. Check first.
- Never bypass the mode-correct table (e.g. don't put a kids log in `pregnancy_logs`).
- Use the existing `Pillar` / log shape — don't invent fields.

## Output

- Files created/modified
- Exact migration command to run
- Reminder: "Test the form end-to-end in the simulator before considering this done."
- If insights handling was skipped, flag it for follow-up.
