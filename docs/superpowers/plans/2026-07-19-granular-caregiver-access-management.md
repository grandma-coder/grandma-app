# Granular Caregiver Access Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the account owner control, per-caregiver, exactly which home cards each caregiver sees and which capabilities (view / log / chat / emergency / edit-child) they have — behind a master feature flag that ships OFF.

**Architecture:** Wire the already-built-but-unmounted `ShareCardsEditor` into the owner's `EditMemberSheet` in `app/profile/care-circle.tsx`, gated by a new persisted `useFeatureFlags` store toggled from the Dev Panel. The granular editor writes a full `CaregiverPermissions` object (capability booleans + `_shared_cards` allowlist) to `child_caregivers.permissions` JSONB. RLS already backs every capability including `edit_child`, so there is **no database migration**.

**Tech Stack:** Expo SDK 54 / React Native 0.81 / React 19, Zustand v5 (`persist` + AsyncStorage), TypeScript strict, Jest + `@testing-library/react-native`, Supabase (`child_caregivers` table, JSONB `permissions`).

## Global Constraints

- **Design tokens only** — import from `constants/theme.ts` via `useTheme()`; no raw hex, no hardcoded radius/font/shadow. Cards `radius.lg`, pills `radius.full`, inputs `radius.md`. (`.claude/rules/code-style.md`)
- **Zustand v5 named import** — `import { create } from 'zustand'`.
- **Persisted stores** MUST have a `hydrated` flag + `onRehydrateStorage` callback that flips it; consumers must gate on `hydrated` before deriving UI. Canonical pattern: `store/useThemeStore.ts`.
- **TypeScript strict** — no `any`, no implicit returns.
- **No new DB migration** — `child_caregivers.permissions` is free-form JSONB; RLS already honors `view` / `log_activity` / `chat` / `emergency` / `edit_child`.
- **RLS is the security boundary** — the editor is UX only. Never claim the editor "enforces" access.
- **Feature flag default OFF** — the whole granular surface ships dark.
- **No regression when flag OFF** — the existing 3-tier `PERMISSION_LEVELS` picker + preset-write path must remain byte-for-byte behavior-identical.
- **Test command:** `npm test -- <path>` (jest, preset `jest-expo`).
- **Typecheck command:** `npm run typecheck`.
- **User works on `main`** — no worktrees/branches unless asked.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `store/useFeatureFlags.ts` | **New.** Persisted feature-flag store. Holds `granularCaregiverAccess` (default false) + `hydrated` gate. |
| `store/__tests__/useFeatureFlags.test.ts` | **New.** Store defaults + setter behavior. |
| `lib/caregiverCards.ts` | Add `modeToBehavior(mode)` — single source for JourneyMode → CaregiverBehavior. |
| `lib/__tests__/caregiverCards.test.ts` | **New.** Cover `modeToBehavior` mapping. |
| `components/caregiver/ShareCardsEditor.tsx` | Add `edit_child` capability row to "What can they do?". |
| `components/caregiver/__tests__/ShareCardsEditor.test.tsx` | Cover the new `edit_child` row. |
| `app/dev-panel.tsx` | Add "FEATURE FLAGS" section with the `granularCaregiverAccess` toggle. |
| `lib/caregiverPermissions.ts` | Add pure `buildPermissionsObject(...)` merge helper (natural home — the capability model already lives here). |
| `lib/__tests__/caregiverPermissions.buildPermissions.test.ts` | **New.** Pure-function test of the merge helper (granular path + preset path + photo override). |
| `app/profile/care-circle.tsx` | Flag-gated branch in `EditMemberSheet` (mount `ShareCardsEditor`); route `updateMember` through `buildPermissionsObject`; extend `onSaved` to carry a full `permissions` object. |

---

## Task 1: `modeToBehavior` helper

Factor the JourneyMode → CaregiverBehavior mapping (currently inline at `app/(tabs)/index.tsx:62-65`) into one exported helper so the care-circle editor and the home screen share a single definition.

**Files:**
- Modify: `lib/caregiverCards.ts` (append helper near the bottom, after `roleDefaultCards`)
- Test: `lib/__tests__/caregiverCards.test.ts` (create)

**Interfaces:**
- Consumes: `JourneyMode` from `../types`, `CaregiverBehavior` (already defined in `lib/caregiverCards.ts`).
- Produces: `export function modeToBehavior(mode: JourneyMode): CaregiverBehavior` — `'kids' → 'kids'`, `'pregnancy' → 'pregnancy'`, `'pre-pregnancy' → 'cycle'`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/caregiverCards.test.ts`:

```ts
import { modeToBehavior } from '../caregiverCards'

describe('modeToBehavior', () => {
  it('maps kids to kids', () => {
    expect(modeToBehavior('kids')).toBe('kids')
  })
  it('maps pregnancy to pregnancy', () => {
    expect(modeToBehavior('pregnancy')).toBe('pregnancy')
  })
  it('maps pre-pregnancy to cycle', () => {
    expect(modeToBehavior('pre-pregnancy')).toBe('cycle')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/caregiverCards.test.ts`
Expected: FAIL — `modeToBehavior is not a function` (not exported yet).

- [ ] **Step 3: Add the helper**

At the top of `lib/caregiverCards.ts`, extend the type import:

```ts
import type { CaregiverRole, JourneyMode } from '../types'
```

(The file currently imports only `CaregiverRole`. If `JourneyMode` is already imported elsewhere in the file, do not duplicate.)

Append at the end of `lib/caregiverCards.ts`:

```ts
/**
 * The CaregiverBehavior a home renders for a given journey mode. Pre-pregnancy
 * IS the cycle behavior (CycleHome is the pre-pregnancy home). Single source of
 * truth — mirrors the inline mapping in app/(tabs)/index.tsx.
 */
export function modeToBehavior(mode: JourneyMode): CaregiverBehavior {
  if (mode === 'kids') return 'kids'
  if (mode === 'pregnancy') return 'pregnancy'
  return 'cycle'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/caregiverCards.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add lib/caregiverCards.ts lib/__tests__/caregiverCards.test.ts
git commit -m "feat(caregiver): add modeToBehavior helper"
```

---

## Task 2: Feature-flag store

**Files:**
- Create: `store/useFeatureFlags.ts`
- Test: `store/__tests__/useFeatureFlags.test.ts`

**Interfaces:**
- Produces:
  - `useFeatureFlags` — Zustand hook with state `{ granularCaregiverAccess: boolean; hydrated: boolean; setGranularCaregiverAccess: (v: boolean) => void; setHydrated: (v: boolean) => void }`.
  - Default `granularCaregiverAccess: false`, `hydrated: false`.

- [ ] **Step 1: Write the failing test**

Create `store/__tests__/useFeatureFlags.test.ts`:

```ts
import { useFeatureFlags } from '../useFeatureFlags'

describe('useFeatureFlags', () => {
  beforeEach(() => {
    useFeatureFlags.setState({ granularCaregiverAccess: false })
  })

  it('defaults granularCaregiverAccess to false', () => {
    expect(useFeatureFlags.getState().granularCaregiverAccess).toBe(false)
  })

  it('setGranularCaregiverAccess flips the flag', () => {
    useFeatureFlags.getState().setGranularCaregiverAccess(true)
    expect(useFeatureFlags.getState().granularCaregiverAccess).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- store/__tests__/useFeatureFlags.test.ts`
Expected: FAIL — cannot find module `../useFeatureFlags`.

- [ ] **Step 3: Create the store**

Create `store/useFeatureFlags.ts` (mirrors the persisted + hydration pattern in `store/useThemeStore.ts`):

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * App-level feature flags. Toggled from the Dev Panel; persisted so a flip
 * survives an app kill. Ships OFF so new surfaces land dark and get turned on
 * without a rebuild. No remote config exists yet — this store is the single
 * swap point if one is added later.
 */
interface FeatureFlagsState {
  /** Master gate for the granular caregiver access editor in Care Circle. */
  granularCaregiverAccess: boolean
  hydrated: boolean
  setGranularCaregiverAccess: (v: boolean) => void
  setHydrated: (v: boolean) => void
}

export const useFeatureFlags = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      granularCaregiverAccess: false,
      hydrated: false,
      setGranularCaregiverAccess: (v) => set({ granularCaregiverAccess: v }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'grandma-feature-flags',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ granularCaregiverAccess: state.granularCaregiverAccess }),
      // Flip hydrated even when nothing was persisted (see useThemeStore).
      onRehydrateStorage: () => () => {
        useFeatureFlags.setState({ hydrated: true })
      },
    },
  ),
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- store/__tests__/useFeatureFlags.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add store/useFeatureFlags.ts store/__tests__/useFeatureFlags.test.ts
git commit -m "feat(flags): add persisted feature-flag store"
```

---

## Task 3: `edit_child` capability row in `ShareCardsEditor`

**Files:**
- Modify: `components/caregiver/ShareCardsEditor.tsx:25-34` (`CapabilityRow` type + `CAPABILITY_ROWS`)
- Test: `components/caregiver/__tests__/ShareCardsEditor.test.tsx`

**Interfaces:**
- Consumes: `CaregiverPermissions` (already has `edit_child?: boolean`).
- Produces: a 4th toggle row keyed `edit_child`; toggling it calls `onChange({ ...value, edit_child: !value.edit_child })` (existing `toggleCapability` already handles any key).

- [ ] **Step 1: Write the failing test**

Append to `components/caregiver/__tests__/ShareCardsEditor.test.tsx` inside the `describe`:

```ts
  it('renders an edit-child capability row and toggling it writes edit_child', () => {
    const onChange = jest.fn()
    const { getByText } = render(
      <ShareCardsEditor behavior="kids" role="nanny"
        value={{ view: true, log_activity: true, chat: false, edit_child: false }}
        onChange={onChange} />,
    )
    fireEvent.press(getByText(/edit child profile/i))
    const next = onChange.mock.calls[0][0]
    expect(next.edit_child).toBe(true)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/caregiver/__tests__/ShareCardsEditor.test.tsx`
Expected: FAIL — `getByText(/edit child profile/i)` finds no element.

- [ ] **Step 3: Add the capability row**

In `components/caregiver/ShareCardsEditor.tsx`, extend the `CapabilityRow` union (line ~26) and the `CAPABILITY_ROWS` array (lines ~30-34):

```ts
interface CapabilityRow {
  key: 'log_activity' | 'emergency' | 'chat' | 'edit_child'
  label: string
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  { key: 'log_activity', label: 'Can log activity' },
  { key: 'emergency', label: 'Can view emergency info' },
  { key: 'chat', label: 'Can chat' },
  { key: 'edit_child', label: 'Can edit child profile & health info' },
]
```

No other change is needed — `toggleCapability` already does `onChange({ ...value, [key]: !value[key] })`, and the render loop already maps `CAPABILITY_ROWS`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- components/caregiver/__tests__/ShareCardsEditor.test.tsx`
Expected: PASS (all 4 tests, including the 3 pre-existing).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/caregiver/ShareCardsEditor.tsx components/caregiver/__tests__/ShareCardsEditor.test.tsx
git commit -m "feat(caregiver): add edit_child capability toggle to ShareCardsEditor"
```

---

## Task 4: Permissions-merge helper (pure function) + tests

Extract the "build the JSONB object to persist" logic into a pure, exported helper so both the flag-ON (granular) and flag-OFF (preset) write paths are unit-testable without rendering React or mocking Supabase.

**Files:**
- Modify: `app/profile/care-circle.tsx` (add exported helper near `PERMISSION_LEVELS`, line ~163)
- Test: `lib/__tests__/caregiverPermissions.buildPermissions.test.ts` (create)

**Why `lib/`, not the screen:** no existing test imports a screen `.tsx` (verified — tests only import from `lib/`, `store/`, `components/`). Importing from `app/profile/care-circle.tsx` would pull the whole RN/expo/lucide screen module into jest. The helper is pure and belongs with the capability model in `lib/caregiverPermissions.ts`.

**Interfaces:**
- Consumes: `CaregiverPermissions`, `CaregiverCapability` from `../types`.
- Produces (in `lib/caregiverPermissions.ts`):
  ```ts
  export function buildPermissionsObject(args: {
    existing: CaregiverPermissions        // member.permissions
    displayName: string
    photoUrl?: string                     // already-resolved storage path/url (NOT a local file)
    presetPerms?: CaregiverCapability[]   // resolved perms array, flag-OFF path
    granular?: CaregiverPermissions       // full object, flag-ON path
  }): CaregiverPermissions
  ```
  Rules:
  - Meta keys always preserved/updated: `_display_name = displayName`; `_photo_url = photoUrl ?? existing._photo_url` (only if truthy); `_paused` copied from `existing._paused` when true.
  - If `granular` is provided: capability booleans + `_shared_cards` come from `granular`; meta keys applied on top.
  - Else (`presetPerms` path): capabilities = booleans expanded from the passed array (defaults to `['view']`); no `_shared_cards` written (preset path is coarse, unchanged behavior).

  The caller resolves `presetPerms` from `PERMISSION_LEVELS` (which stays in the screen) and passes the array in — keeping the helper free of screen constants.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/caregiverPermissions.buildPermissions.test.ts`:

```ts
import { buildPermissionsObject } from '../caregiverPermissions'

describe('buildPermissionsObject', () => {
  it('granular path writes capabilities + _shared_cards and preserves meta', () => {
    const out = buildPermissionsObject({
      existing: { view: true, log_activity: true, chat: true, _paused: true, _photo_url: 'p/old.jpg' },
      displayName: 'Nana',
      granular: {
        view: true, log_activity: true, chat: false, edit_child: true, emergency: false,
        _shared_cards: { kids: ['hero-tiles', 'diaper'] },
      },
    })
    expect(out.edit_child).toBe(true)
    expect(out.chat).toBe(false)
    expect(out._shared_cards?.kids).toEqual(['hero-tiles', 'diaper'])
    expect(out._display_name).toBe('Nana')
    expect(out._photo_url).toBe('p/old.jpg')
    expect(out._paused).toBe(true)
  })

  it('preset path expands perms and writes no _shared_cards', () => {
    const out = buildPermissionsObject({
      existing: { view: true, log_activity: false, chat: false },
      displayName: 'Sitter',
      presetPerms: ['view', 'log_activity', 'chat'],
    })
    expect(out.view).toBe(true)
    expect(out.log_activity).toBe(true)
    expect(out.chat).toBe(true)
    expect(out.edit_child).toBeUndefined()
    expect(out._shared_cards).toBeUndefined()
    expect(out._display_name).toBe('Sitter')
  })

  it('new photo path overrides stored _photo_url', () => {
    const out = buildPermissionsObject({
      existing: { view: true, log_activity: false, chat: false, _photo_url: 'p/old.jpg' },
      displayName: 'X',
      photoUrl: 'p/new.jpg',
      presetPerms: ['view'],
    })
    expect(out._photo_url).toBe('p/new.jpg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/caregiverPermissions.buildPermissions.test.ts`
Expected: FAIL — `buildPermissionsObject` is not exported from `lib/caregiverPermissions.ts`.

- [ ] **Step 3: Add the exported helper**

At the top of `lib/caregiverPermissions.ts`, extend the type import to include `CaregiverPermissions` and `CaregiverCapability` (the file already imports `CaregiverCapability`, `ChildWithRole` — add `CaregiverPermissions`):

```ts
import type { CaregiverCapability, CaregiverPermissions, ChildWithRole } from '../types'
```

Append at the end of `lib/caregiverPermissions.ts`:

```ts
/**
 * Build the `child_caregivers.permissions` JSONB to persist for a member edit.
 * Pure — no screen constants, no Supabase. Two paths:
 *   - granular (flag ON): capability booleans + _shared_cards come verbatim from
 *     the editor's working object.
 *   - preset  (flag OFF): capabilities expanded from the passed `presetPerms`
 *     array; no _shared_cards (coarse path, unchanged legacy behavior).
 * Meta keys (_display_name / _photo_url / _paused) are always preserved on top.
 * `photoUrl` must already be a stored path/url — local-file upload happens in the
 * caller before this runs.
 */
export function buildPermissionsObject(args: {
  existing: CaregiverPermissions
  displayName: string
  photoUrl?: string
  presetPerms?: CaregiverCapability[]
  granular?: CaregiverPermissions
}): CaregiverPermissions {
  const { existing, displayName, photoUrl, presetPerms, granular } = args
  let out: CaregiverPermissions

  if (granular) {
    out = { ...granular }
  } else {
    const perms = presetPerms ?? ['view']
    out = { view: false, log_activity: false, chat: false }
    for (const p of perms) (out as Record<string, unknown>)[p] = true
  }

  out._display_name = displayName
  const resolvedPhoto = photoUrl ?? existing._photo_url
  if (resolvedPhoto) out._photo_url = resolvedPhoto
  if (existing._paused === true) out._paused = true

  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/caregiverPermissions.buildPermissions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add lib/caregiverPermissions.ts lib/__tests__/caregiverPermissions.buildPermissions.test.ts
git commit -m "feat(caregiver): add buildPermissionsObject merge helper"
```

---

## Task 5: Route `updateMember` through the merge helper

Refactor the existing `updateMember` (`app/profile/care-circle.tsx:664-711`) to (a) accept an optional full `permissions` object and (b) delegate JSONB construction to `buildPermissionsObject`. Preset behavior must stay identical when `permissions` is absent.

**Files:**
- Modify: `app/profile/care-circle.tsx` — import block + `updateMember` (lines ~664-711)

**Interfaces:**
- Consumes: `buildPermissionsObject` (Task 4) from `../../lib/caregiverPermissions`, `PERMISSION_LEVELS` (module-local), `uploadCaregiverPhoto` (existing), `CaregiverPermissions` / `CaregiverCapability` from `../../types`.
- Produces: `updateMember(member, updates)` where `updates` now also allows `permissions?: CaregiverPermissions`.

- [ ] **Step 1: Add imports**

In the `app/profile/care-circle.tsx` import block, add (merge onto existing `../../types` import if one exists):

```ts
import type { CaregiverPermissions, CaregiverCapability } from '../../types'
import { buildPermissionsObject } from '../../lib/caregiverPermissions'
```

- [ ] **Step 2: Update `updateMember`**

Replace the body of `updateMember` with (note: the preset `perms` are resolved here from `PERMISSION_LEVELS` and passed as `presetPerms`, keeping the helper screen-free):

```ts
  async function updateMember(
    member: CareCircleMember,
    updates: {
      displayName?: string
      photoUrl?: string
      role?: string
      permLevel?: string
      permissions?: CaregiverPermissions
      childIds?: string[]
    },
  ) {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Resolve a freshly-picked LOCAL photo to a stored path first.
      const isLocalFile = (v?: string) => !!v && (v.startsWith('file:') || v.startsWith('content:'))
      let resolvedPhoto: string | undefined
      if (updates.photoUrl && isLocalFile(updates.photoUrl) && session) {
        try {
          resolvedPhoto = await uploadCaregiverPhoto(updates.photoUrl, session.user.id)
        } catch (e) {
          console.warn('Photo upload failed:', e)
          resolvedPhoto = updates.photoUrl // fallback to local URI
        }
      } else if (updates.photoUrl) {
        resolvedPhoto = updates.photoUrl
      }

      const presetPerms = updates.permissions
        ? undefined
        : ((PERMISSION_LEVELS.find((p) => p.id === updates.permLevel)?.perms ?? ['view']) as CaregiverCapability[])

      const permObj = buildPermissionsObject({
        existing: member.permissions,
        displayName: updates.displayName ?? member.displayName,
        photoUrl: resolvedPhoto,
        presetPerms,
        granular: updates.permissions,
      })

      const selectedRole = ROLES.find((r) => r.id === updates.role)
      const dbRole = updates.role ? ((selectedRole as any)?.dbRole ?? selectedRole?.id ?? member.role) : member.role
      const safeRole = ['parent', 'nanny', 'family'].includes(dbRole) ? dbRole : member.role

      for (const id of member.rowIds) {
        await supabase.from('child_caregivers').update({
          role: safeRole,
          permissions: permObj,
        }).eq('id', id)
      }

      loadMembers()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }
```

- [ ] **Step 3: Verify the helper test still passes + typecheck**

Run: `npm test -- lib/__tests__/caregiverPermissions.buildPermissions.test.ts`
Expected: PASS (helper unchanged; this confirms the merge contract the screen now depends on).

Run: `npm run typecheck`
Expected: no new errors (`PERMISSION_LEVELS.perms` is `string[]`; the `as CaregiverCapability[]` cast is intentional — the presets only contain valid capability keys).

- [ ] **Step 4: Commit**

```bash
git add app/profile/care-circle.tsx
git commit -m "refactor(caregiver): route updateMember through buildPermissionsObject"
```

---

## Task 6: Flag-gated granular editor in `EditMemberSheet`

Render `ShareCardsEditor` (for the owner's active behavior) instead of the 3-tier picker when the flag is ON; keep the preset picker when OFF. Pass the working permissions object up through `onSaved`.

**Files:**
- Modify: `app/profile/care-circle.tsx` — `EditMemberSheet` (lines ~1884-2010), its `onSaved` call site (lines ~1299-1309), and the component imports.

**Interfaces:**
- Consumes: `useFeatureFlags` (Task 2), `modeToBehavior` (Task 1), `ShareCardsEditor` (Task 3), `useModeStore`, `CaregiverPermissions`.
- Produces: `EditMemberSheet`'s `onSaved` now emits `{ displayName; photoUrl; role; permLevel?; permissions? }` — `permissions` present only on the flag-ON path.

- [ ] **Step 1: Add imports**

In `app/profile/care-circle.tsx` import block, add:

```ts
import { useFeatureFlags } from '../../store/useFeatureFlags'
import { modeToBehavior } from '../../lib/caregiverCards'
import { ShareCardsEditor } from '../../components/caregiver/ShareCardsEditor'
```

Notes:
- `useModeStore` is already imported (line 57) — do NOT re-add.
- `CaregiverPermissions` was already imported in Task 5. Extend that import to also bring in `CaregiverRole`:
  ```ts
  import type { CaregiverPermissions, CaregiverCapability, CaregiverRole } from '../../types'
  ```

- [ ] **Step 2: Widen the `onSaved` prop type + add flag/behavior/state to `EditMemberSheet`**

Change `EditMemberSheet`'s props (line ~1884-1888):

```ts
function EditMemberSheet({ member, onClose, onSaved }: {
  member: CareCircleMember
  onClose: () => void
  onSaved: (updates: {
    displayName?: string
    photoUrl?: string
    role?: string
    permLevel?: string
    permissions?: CaregiverPermissions
  }) => void
}) {
```

Inside `EditMemberSheet`, after the existing `useState` hooks (after `editPermLevel`, ~line 1913), add:

```ts
  const granularEnabled = useFeatureFlags((s) => s.granularCaregiverAccess)
  const flagsHydrated = useFeatureFlags((s) => s.hydrated)
  const mode = useModeStore((s) => s.mode)
  const behavior = modeToBehavior(mode)
  const [workingPerms, setWorkingPerms] = useState<CaregiverPermissions>(() => ({ ...member.permissions }))
  const showGranular = flagsHydrated && granularEnabled
```

- [ ] **Step 3: Branch the permission UI + Save payload**

Replace the `PERMISSION_LEVELS.map(...)` block (lines ~1956-1974) and the `SheetButton` (lines ~1975-1978) with:

```ts
          <View style={{ marginTop: 4 }}><MonoCaps color={mutedColor}>{t('careCircle_field_permission_level')}</MonoCaps></View>
          {showGranular ? (
            <ShareCardsEditor
              behavior={behavior}
              role={member.role as CaregiverRole}
              value={workingPerms}
              onChange={setWorkingPerms}
            />
          ) : (
            PERMISSION_LEVELS.map((p) => {
              const active = editPermLevel === p.id
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setEditPermLevel(p.id)}
                  style={[sheetStyles.permCard, {
                    backgroundColor: active ? inkActiveBg : paper,
                    borderColor: active ? inkActiveBorder : paperBorder,
                  }]}
                >
                  <Text style={[sheetStyles.permLabel, { color: active ? inkActiveText : textColor, fontFamily: displayFont }]}>{p.label}</Text>
                  <Text style={[sheetStyles.permDesc, { color: mutedColor, fontFamily: bodyFont }]}>{p.desc}</Text>
                </Pressable>
              )
            })
          )}

          <SheetButton
            label="Save Changes"
            onPress={() =>
              onSaved(
                showGranular
                  ? { displayName: editName.trim(), photoUrl: editPhotoUri, role: editRole, permissions: workingPerms }
                  : { displayName: editName.trim(), photoUrl: editPhotoUri, role: editRole, permLevel: editPermLevel },
              )
            }
          />
```

(`CaregiverRole` was added to the `../../types` import in Step 1.)

- [ ] **Step 4: Confirm the call site passes through unchanged**

The existing call site (lines ~1300-1308) already forwards `updates` verbatim to `updateMember`, which now handles `permissions`. No change needed there — verify by reading it.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Run the full caregiver test set**

Run: `npm test -- components/caregiver lib/__tests__/caregiverPermissions.buildPermissions.test.ts store/__tests__/useFeatureFlags.test.ts lib/__tests__/caregiverCards.test.ts`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add app/profile/care-circle.tsx
git commit -m "feat(caregiver): flag-gated granular access editor in EditMemberSheet"
```

---

## Task 7: Dev Panel toggle

Expose `granularCaregiverAccess` in the Dev Panel so it can be flipped without a rebuild.

**Files:**
- Modify: `app/dev-panel.tsx` — add a "FEATURE FLAGS" `<Section>` (place it right after the `DESIGN VARIANT` section, ~line 387) and wire the store.

**Interfaces:**
- Consumes: `useFeatureFlags` (Task 2).

- [ ] **Step 1: Import and read the store**

Add to the import block of `app/dev-panel.tsx`:

```ts
import { useFeatureFlags } from '../store/useFeatureFlags'
```

Inside `DevPanel()`, near the other store hooks (after `const setVariant = ...`, ~line 136):

```ts
  const granularCaregiverAccess = useFeatureFlags((s) => s.granularCaregiverAccess)
  const setGranularCaregiverAccess = useFeatureFlags((s) => s.setGranularCaregiverAccess)
```

- [ ] **Step 2: Add the section**

Immediately after the closing `</Section>` of `DESIGN VARIANT` (~line 386), insert:

```tsx
        {/* Feature flags */}
        <Section title="FEATURE FLAGS">
          <Body size={11} color={colors.textMuted}>
            Master gates for surfaces that ship dark. Persisted across app restarts.
          </Body>
          <Pressable
            onPress={() => setGranularCaregiverAccess(!granularCaregiverAccess)}
            style={({ pressed }) => [
              styles.actionRow,
              { borderColor: granularCaregiverAccess ? colors.primary : colors.borderLight, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Body size={14} color={colors.text} style={{ fontWeight: '600', flex: 1 }}>
              Granular caregiver access
            </Body>
            <Body size={12} color={granularCaregiverAccess ? colors.primary : colors.textMuted}>
              {granularCaregiverAccess ? '✓ on' : 'off'}
            </Body>
          </Pressable>
        </Section>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 4: Manual smoke (device/simulator)**

1. Open Dev Panel → FEATURE FLAGS → toggle "Granular caregiver access" ON.
2. Profile → Care Circle → edit a member → confirm the "What can they see?" / "What can they do?" granular editor renders (with the `edit_child` row) instead of the 3-tier picker.
3. Toggle a couple of cards + `edit_child`, Save, re-open → selections persisted.
4. Toggle the flag OFF → edit the member again → the 3-tier picker returns.

- [ ] **Step 5: Commit**

```bash
git add app/dev-panel.tsx
git commit -m "feat(dev): add granular caregiver access feature-flag toggle"
```

---

## Self-Review notes (already reconciled)

- **Spec coverage:** §1 flag → Tasks 2 & 7; §2 granular editor wiring → Tasks 1, 3, 6; §3 `updateMember` refactor + edge cases → Tasks 4 & 5; testing section → Tasks 1-4 tests + Task 6 aggregate run + Task 7 smoke. `edit_child` control → Task 3. No migration → honored (no SQL task).
- **Behavior source correction:** behavior comes from the owner's active mode (`app/(tabs)/index.tsx:62-65`), centralized in `modeToBehavior` (Task 1) — not per-child. One `ShareCardsEditor` for the active behavior.
- **Type consistency:** `buildPermissionsObject` (Task 4, in `lib/caregiverPermissions.ts`) takes `presetPerms?: CaregiverCapability[]` / `granular?: CaregiverPermissions`; `updateMember` (Task 5) resolves `presetPerms` from `PERMISSION_LEVELS` and passes the exact arg shape; `onSaved` payload (Task 6) includes `permissions?: CaregiverPermissions` which `updateMember` accepts (Task 5). `modeToBehavior` signature identical across Tasks 1 & 6.
- **Test-isolation:** the pure merge helper lives in `lib/` (Task 4), so no test imports a screen `.tsx` — consistent with every existing test (verified: none import `app/**/*.tsx`).
- **No-placeholder:** all steps carry concrete code + exact commands.

## Known limitations (accepted, out of scope)

- **Diffuse styling:** `ShareCardsEditor` is a current-system (`PaperCard` / `useTheme()`) component. When the app runs under the Diffuse variant, the editor will render in the current visual language inside a Diffuse screen. This matches the spec's design-system section (which scoped `ShareCardsEditor` as-is) and the standing decision that stickers/icons stay active under Diffuse. A Diffuse restyle of `ShareCardsEditor` is a separate follow-up.
- **Caregiver-side edit UI:** granting `edit_child` unmasks PHI + satisfies write RLS today, but the caregiver's own child-profile-edit screen that *consumes* it is out of scope (per spec non-goals).
