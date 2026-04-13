# /migrate

Create a new Supabase migration for grandma.app.

Ask the user what the migration should do.

Then:

1. Generate the filename: `supabase/migrations/YYYYMMDD_<short_description>.sql`
   - Use today's date
   - Use snake_case for the description (e.g. `20260412_add_sleep_logs`)

2. Write the SQL with:
   - `CREATE TABLE IF NOT EXISTS` (never plain `CREATE TABLE`)
   - RLS enabled: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
   - Policy for owner access:
     ```sql
     CREATE POLICY "<table>_owner" ON <table>
       FOR ALL USING (auth.uid() = user_id);
     ```
   - Indexes on `user_id` and `created_at` for any new table
   - Timestamps: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
   - Foreign keys with `ON DELETE CASCADE` for child-linked tables

3. After creating the file, remind the user to run:
   ```bash
   supabase db push
   # or for local dev:
   supabase migration up
   ```
