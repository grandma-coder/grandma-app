<!--
  grandma.app recurring-failure pattern library.
  Written ONLY by grandma-compound at orchestration run close.
  Read by grandma-orchestrate: matched entries are injected into implement + review gates
  (via patterns.mjs match) so known failure modes are avoided up front, not re-caught.
  Entry format is enforced by `patterns.mjs lint` — keep it exact.
-->

## P-001 · profile-write-upsert-not-update [active]
Rule: Writes to `profiles` in onboarding/first-write paths must `upsert({ id, ... }, { onConflict: 'id' })`, never `.update().eq('id', ...)` (0-row silent no-op for a behavior-first user whose row does not exist yet).
Scope: app/onboarding/**, components/**/[Ll]ogForms*.tsx
Evidence: menopause-behavior-foundation (2 hits — U6 onboarding finish P0 a4535c2, U7 period-form P1 f6d29ce)
Added: 2026-07-29 · Last hit: 2026-07-29
