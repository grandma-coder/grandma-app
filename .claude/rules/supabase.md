# Supabase Conventions — grandma.app

## Client
- Single client in `lib/supabase.ts` — import it everywhere, never create a new client
- Uses `ExpoSecureStoreAdapter` for token persistence (not AsyncStorage)

## Queries
```ts
// Always destructure error and handle it
const { data, error } = await supabase.from('table').select('*').eq('user_id', userId)
if (error) throw error
```
- Always filter by `user_id` — RLS enforces it server-side but filter client-side too for clarity
- Use `.single()` only when you're certain one row exists — otherwise use array + `[0]`

## RLS Rules (all migrations must follow)
- Enable RLS on every new table: `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY`
- Owner policy covers all operations: `USING (auth.uid() = user_id)`
- Care circle access uses the `care_circle` table — never bypass RLS

## Auth
- Session is available via `supabase.auth.getSession()`
- Listen for auth changes: `supabase.auth.onAuthStateChange()`
- Apple sign-in: `lib/auth-providers.ts` → `signInWithApple()`
- Google sign-in: `lib/auth-providers.ts` → `signInWithGoogle()` (OAuth)

## Edge Functions
- Called via `supabase.functions.invoke('<name>', { body: { ... } })`
- Never call Anthropic API directly from the app — always via edge functions
- ANTHROPIC_API_KEY is a Supabase secret: `supabase secrets set ANTHROPIC_API_KEY=...`
- Claude model string: `claude-sonnet-4-20250514`
- Always handle CORS and OPTIONS preflight in every edge function

## Storage
- Scan images bucket: `scan-images`
- Compress images to <1MB before upload using `expo-image-manipulator`
- Vault documents: use signed URLs for access (not public buckets)

## Migrations
- File format: `supabase/migrations/YYYYMMDD_description.sql`
- `CREATE TABLE IF NOT EXISTS` always
- Add indexes: `user_id`, `child_id`, `created_at`
- Timestamps: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Foreign keys: `ON DELETE CASCADE` for child-linked data

## Real-time
- Use Supabase Realtime only for chat messages and nanny notes — not for activity logs (poll instead)
```ts
supabase.channel('room').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, handler).subscribe()
```
