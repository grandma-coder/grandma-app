# Kids Onboarding Audit — 2026-05-15

**Scope:** `app/onboarding/kids/{_layout,index}.tsx`, `store/useKidsOnboardingStore.ts`, `store/useChildStore.ts`, `app/onboarding/child-profile.tsx`, `lib/growthLeaps.ts`, `components/home/KidsHome.tsx`, `components/ui/DatePickerField.tsx`, vaccine schedule migration.

---

## 1. Flow Map

```
[child_count]   stepper 1–6 (clamped)
   │ × N children
[child_name]    required TextInput, "Child N —" prefix when N>1
[child_dob]     DatePickerField, min 2005-01-01, max today, required
[child_country] searchable dropdown, 11 hardcoded countries, default US
[child_photo]   AvatarPickerModal (camera roll + 12 icons), skippable
[child_allergies] chip grid (10 + Other), skippable
[child_conditions] free-text multiline, skippable
   ▼
[partner]       free-text name, skippable
[caregiver]     role chip + name, skippable
   ▼
[completion]    → saveAndFinish:
                   behaviors.insert            (no error check!)
                   children.insert → child_caregivers.insert
                   care_circle (parent + caregiver)
                   setChildrenStore(mapped)
                 → store.clearAll() + onboardingComplete()
                 → useModeStore.setMode('kids')
                 → router.replace('/(tabs)')
```

**Not collected:** sex/gender, blood type, breastfeeding/formula, height, weight, pediatrician (those exist only in the dead-end `child-profile.tsx`).

**Multiple kids:** up to 6 in one session (39 steps for max).

---

## 2. Findings

### [Bug] P0 — `behaviors.insert` error silently swallowed
**File:** `index.tsx:128`
```ts
await supabase.from('behaviors').insert({ user_id: userId, type: 'kids', active: true })
// no { error } destructured
```
Re-run onboarding → unique-constraint violation → mode row never created. Use `upsert` with `onConflict: 'user_id,type'` + throw on error.

### [Bug] P0 — `saveAndFinish` clears data and navigates after fatal error
**File:** `index.tsx:120, 263-268`
```ts
async function saveAndFinish() {
  try { /* all Supabase work */ }
  catch (e) { console.warn(...) }
  store.clearAll()        // ← always runs
  onboardingComplete()    // ← always runs
}
```
Network failure → user lands in `/(tabs)` with **zero children**, draft data destroyed, no retry possible. Move cleanup inside `try` success; show `Alert` + return on catch.

### [Bug] P0 — Multiple `any` casts mask schema typos
**File:** `index.tsx:163, 173, 177, 240`. `.select()` is fully specified — define a `ChildRow` interface; note line 244 uses `c.birth_date` while the input was `birthDate` — exactly the kind of typo the casts hide.

### [Bug] P1 — Child photo `file://` URI never uploaded to Supabase Storage
**File:** `index.tsx:663-672`. Local URI stored in Zustand only. Lost on cold relaunch. `children.insert` payload has no `photo_url`. Compress with `expo-image-manipulator`, upload to `child-photos` bucket, persist URL.

### [Bug] P1 — Partner name collected but never written anywhere
**File:** `index.tsx:222-268`. `store.partnerName` set by `StepPartner`, never read in `saveAndFinish`. Discarded by `store.clearAll()`.

### [Bug] P1 — DOB `minimumDate={new Date(2005, 0, 1)}` is arbitrary
**File:** `index.tsx:498`. Children born late 2004 are silently blocked (picker won't accept; no error shown). Remove minimum; warn after selection if `ageYears > 6`.

### [Bug] P1 — `null as any` cast for valid `string | null` assignment
**File:** `index.tsx:717`. Just remove the cast.

### [Architecture] P1 — `GROWTH_LEAPS` duplicated inside `KidsHome.tsx:72-248`
Local copy diverges from `lib/growthLeaps.ts` (different colors, different phase algorithm). Active divergence risk. Import canonical `getActiveGrowthLeap`.

### [Architecture] P1 — `child-profile.tsx` is an incompatible parallel write path
Independent insert to `children` + `child_caregivers`, allergies as comma-delimited string (vs. array). Doesn't insert into `behaviors`. Same column receives structurally different data depending on path.

### [Architecture] P1 — Vaccine schedule never seeded at onboarding
**File:** migration `20260512130000_kids_vaccine_schedule.sql`. Rows only created when parent taps "Schedule" inside `KidsHome`. Parents who skip the vaccine panel never get reminders even though DOB + country are known. Seed `getNextDueVaccines(dob, countryCode)` in `saveAndFinish` (or DB trigger).

### [Pattern] P1 — `saveAndFinish` not wrapped in `useCallback`
**File:** `index.tsx:120, 274`. New ref every render → passed as prop to `CompletionScreen`.

### [Pattern] P1 — Nested `ScrollView` (country dropdown) without `nestedScrollEnabled`
**File:** `index.tsx:604`. Android scroll-swallow risk.

### [Architecture] P2 — No resumability (store ephemeral)
6-child flow = 39 steps. App kill = restart. Add `persist` middleware partialized by step.

### [Cleanup] P2 — `isDark` destructured but unused in 8 step components
`index.tsx:362, 429, 552, 655, 739, 800, 846, 894`.

### [Design] P2 — Completion CTA `radius.lg` + hardcoded `#FFFFFF`
`index.tsx:1047-1054, 1278-1288`. Use `PillButton`.

### [Design] P2 — `child-profile.tsx:47-52` inlines raw hex fallbacks
Same redundant `isDark ? colors.bg : '#F3ECD9'` pattern.

### [i18n] P2 — Allergies + roles stored to DB as English regardless of locale
`index.tsx:71-81`. Store canonical keys, translate on read.

### [a11y] P2 — Icon-only `Pressable` (counter +/−, allergy ✓) lacks `accessibilityLabel`/`Role`
`index.tsx:375-410, 756-781`.

### [a11y] P2 — `DatePickerField` modal missing `accessibilityViewIsModal`
`components/ui/DatePickerField.tsx:173`. Android TalkBack can escape modal.

---

## 3. Edge Value Behavior Table

| Scenario | Actual behavior | Status |
|---|---|---|
| DOB = today (newborn) | `formatAge='Newborn'`, leap → upcoming Leap 1 | Correct |
| DOB > 5y ago | Accepted, no warning | Gap |
| DOB future | Blocked by `maximumDate` | Correct |
| DOB < 2005-01-01 | Silently blocked, no explanation | P1 |
| 0 allergies | Empty array | Correct |
| "Other" allergy | Saved as string `"Other"`, no expansion | UX gap |
| 6 children | Max enforced, 39 steps, no resume on kill | P2 |
| Partner filled, caregiver skipped | Partner discarded | P1 bug |
| Session expired mid-save | All data cleared, navigated to tabs with 0 children | P0 bug |

---

## 4. Mode + Landing

`useOnboardingComplete` → `switchTo('kids')` + `setMode('kids')` → `router.replace('/(tabs)')`. `setChildrenStore(mapped)` sets `activeChild[0]`. `KidsHome` reads it. **Path is correct if `saveAndFinish` succeeds.**

---

## Top 3 Fixes

1. **P0 — Fix `saveAndFinish` error propagation** (`index.tsx:263-268`): move cleanup inside `try` success; show retry-able `Alert` on catch. Today, network blip → user lands in home with no children, no path back.
2. **P1 — Upload child photo to Supabase Storage**: compress + upload + persist URL. Today, photo is lost on every cold relaunch.
3. **P1 — Wire partner name to a real write** (or remove the step): currently the user fills it in thinking partner will be added; nothing happens.
