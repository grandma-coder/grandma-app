# Caregiver Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give caregivers (nanny / family / pregnancy-cycle watchers) the *same* behavior home the parent sees, filtered to exactly the cards the parent chose to share, plus a unified "child essentials" wallet card, a pruned tab bar, and a dev toggle to walk the whole flow.

**Architecture:** Extend the existing `child_caregivers.permissions` JSONB with a UX-only `_shared_cards` allowlist meta key (no schema/RLS change). A pure resolver (`visibleCards`) turns that + role defaults into a `Set<cardId>`. The real behavior homes (`KidsHome`/`PregnancyHome`/`CycleHome`) filter their own card render lists through that set; a new `essentials` wallet card is added to all three wallet builders; a `getCaregiverTabConfig` produces the Home/Grandma/Card/You tab set; the invite screen curates the allowlist; a Dev Panel section simulates being a caregiver.

**Tech Stack:** Expo SDK 54 · React Native 0.81 · React 19 · Zustand v5 · TanStack Query v5 · Supabase · Jest · TypeScript strict.

## Global Constraints

- **Test runner:** `npm test` (Jest). Run a single file with `npm test -- <path>`.
- **Design tokens only** — import from `constants/theme.ts` via `useTheme()`. No raw hex in JSX. Cards `radius.lg` (28), buttons `radius.full` (999), inputs `radius.md` (20–24). Shadows only `shadows.card/cardPop/pop/subtle`. (`DESIGN_SYSTEM.md` §5 checklist.)
- **Zustand v5 named import:** `import { create } from 'zustand'`.
- **React Query v5 object syntax:** `useQuery({ queryKey, queryFn })`.
- **Expo Router nav:** `router.push()` / `router.replace()`, never `navigation.navigate()`.
- **`profiles.id` IS the auth UUID** — filter `.eq('id', userId)`.
- **Local dates:** `toDateStr(new Date())`, never `toISOString().split('T')[0]`.
- **RLS is the security boundary** — `_shared_cards` is UX-only and MUST NOT be relied on to gate data; every data read stays gated by the existing capability RLS predicates.
- **Caregiver role values:** `'parent' | 'nanny' | 'family'`. Capabilities: `'view' | 'log_activity' | 'chat' | 'edit_child' | 'emergency'`.
- **No per-mode sibling components** — filter existing homes, don't fork them.
- **User works on `main`** — no worktrees/feature branches by default.

---

## Task 1: `_shared_cards` type + card metadata table

**Files:**
- Modify: `types/index.ts:69-79` (add `_shared_cards` to `CaregiverPermissions`)
- Create: `lib/caregiverCards.ts` (card-id vocabulary, labels, sensitivity tiers, role defaults)
- Test: `lib/__tests__/caregiverCards.test.ts`

**Interfaces:**
- Consumes: `CaregiverRole`, `JourneyMode` from `types`.
- Produces:
  - `type CaregiverBehavior = 'kids' | 'pregnancy' | 'cycle'`
  - `type SensitivityTier = 'safe' | 'child-health' | 'intimate'`
  - `interface CaregiverCardMeta { id: string; label: string; tier: SensitivityTier }`
  - `const CAREGIVER_CARDS: Record<CaregiverBehavior, CaregiverCardMeta[]>`
  - `function roleDefaultCards(behavior: CaregiverBehavior, role: CaregiverRole): string[]`
  - `CaregiverPermissions._shared_cards?: Partial<Record<CaregiverBehavior, string[]>>`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/caregiverCards.test.ts
import { CAREGIVER_CARDS, roleDefaultCards } from '../caregiverCards'

describe('CAREGIVER_CARDS', () => {
  it('includes the unified essentials card in every behavior', () => {
    for (const behavior of ['kids', 'pregnancy', 'cycle'] as const) {
      expect(CAREGIVER_CARDS[behavior].some((c) => c.id === 'essentials')).toBe(true)
    }
  })

  it('marks the truly intimate cycle signals (today_summary) as intimate', () => {
    const cycleTodaySummary = CAREGIVER_CARDS.cycle.find((c) => c.id === 'today_summary')
    expect(cycleTodaySummary?.tier).toBe('intimate')
  })

  it('treats the cycle journey ring (phase + period timing) as child-health, not intimate', () => {
    const ring = CAREGIVER_CARDS.cycle.find((c) => c.id === 'journey_ring')
    expect(ring?.tier).toBe('child-health')
  })

  it('gives every card a non-empty human label', () => {
    for (const behavior of ['kids', 'pregnancy', 'cycle'] as const) {
      for (const card of CAREGIVER_CARDS[behavior]) {
        expect(card.label.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('roleDefaultCards', () => {
  it('gives a kids nanny the log-oriented set incl. essentials, excludes health', () => {
    const set = roleDefaultCards('kids', 'nanny')
    expect(set).toEqual(expect.arrayContaining(['hero-tiles', 'today-summary', 'diaper', 'reminders', 'essentials']))
    expect(set).not.toContain('health')
  })

  it('gives a kids family caregiver a viewer set (no diaper/reminders, has essentials)', () => {
    const set = roleDefaultCards('kids', 'family')
    expect(set).toEqual(expect.arrayContaining(['hero-tiles', 'essentials']))
    expect(set).not.toContain('diaper')
  })

  it('never includes an intimate cycle card in any default set', () => {
    const set = roleDefaultCards('cycle', 'family')
    expect(set).not.toContain('today_summary')
    expect(set).toContain('journey_ring') // phase + period timing only
    expect(set).toContain('essentials')
  })

  it('a parent role default returns every card id for the behavior', () => {
    const all = CAREGIVER_CARDS.kids.map((c) => c.id)
    expect(roleDefaultCards('kids', 'parent').sort()).toEqual([...all].sort())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/caregiverCards.test.ts`
Expected: FAIL — "Cannot find module '../caregiverCards'".

- [ ] **Step 3: Add `_shared_cards` to the type**

In `types/index.ts`, inside `CaregiverPermissions` (after `_photo_url?`), add:

```ts
  // Meta key: per-behavior UX allowlist of home card ids this caregiver sees.
  // Absent → fall back to role defaults. Never a security gate (RLS is).
  _shared_cards?: Partial<Record<'kids' | 'pregnancy' | 'cycle', string[]>>
```

- [ ] **Step 4: Create the card metadata table**

```ts
// lib/caregiverCards.ts
/**
 * Card-id vocabulary for caregiver sharing. These ids are the shared contract
 * that later tasks wire into the behavior homes + wallet builders (Tasks 5–6):
 * the top-level home card ids (hero-tiles, today-summary, week-hero,
 * journey_ring, …) and the wallet builder ids (goals, health, diaper, …), plus
 * the new cross-behavior `essentials` card. A shared-card allowlist maps 1:1
 * onto what a caregiver's filtered home renders. UX metadata only — RLS is the
 * security boundary; nothing here gates data.
 */
import type { CaregiverRole } from '../types'

export type CaregiverBehavior = 'kids' | 'pregnancy' | 'cycle'
export type SensitivityTier = 'safe' | 'child-health' | 'intimate'

export interface CaregiverCardMeta {
  id: string
  label: string
  tier: SensitivityTier
}

export const CAREGIVER_CARDS: Record<CaregiverBehavior, CaregiverCardMeta[]> = {
  kids: [
    { id: 'hero-tiles', label: 'Daily stats (sleep · mood · feeding)', tier: 'child-health' },
    { id: 'today-summary', label: 'Today at a glance', tier: 'child-health' },
    { id: 'health', label: 'Health & care (vaccines, meds)', tier: 'child-health' },
    { id: 'exams', label: 'Exams & lab results', tier: 'child-health' },
    { id: 'diaper', label: 'Diaper tracker', tier: 'child-health' },
    { id: 'growth_leap', label: 'Growth leaps', tier: 'child-health' },
    { id: 'reminders', label: 'Reminders', tier: 'child-health' },
    { id: 'ask_grandma', label: 'Ask Grandma', tier: 'safe' },
    { id: 'rewards', label: 'Rewards', tier: 'safe' },
    { id: 'essentials', label: 'Child essentials card', tier: 'safe' },
  ],
  pregnancy: [
    { id: 'week-hero', label: 'Baby this week', tier: 'child-health' },
    { id: 'daily_message', label: 'Daily message', tier: 'safe' },
    { id: 'today_summary', label: 'Today at a glance', tier: 'child-health' },
    { id: 'appointment', label: 'Appointments', tier: 'child-health' },
    { id: 'week_tip', label: 'Weekly tip', tier: 'safe' },
    { id: 'kicks', label: 'Kick count', tier: 'child-health' },
    { id: 'reminders', label: 'Reminders', tier: 'child-health' },
    { id: 'exams', label: 'Exams', tier: 'child-health' },
    { id: 'birth_guide', label: 'Birth guide', tier: 'safe' },
    { id: 'ask_grandma', label: 'Ask Grandma', tier: 'safe' },
    { id: 'rewards', label: 'Rewards', tier: 'safe' },
    { id: 'essentials', label: 'Essentials card', tier: 'safe' },
  ],
  cycle: [
    // Phase + period timing is the shareable baseline a watcher sees by default
    // (child-health tier). The truly intimate signals live in today_summary.
    { id: 'journey_ring', label: 'Cycle phase & period timing', tier: 'child-health' },
    { id: 'daily_message', label: 'Daily message', tier: 'safe' },
    { id: 'today_summary', label: 'Intimate signals (BBT · LH · intercourse)', tier: 'intimate' },
    { id: 'reminders', label: 'Reminders', tier: 'child-health' },
    { id: 'pillars', label: 'Pillars', tier: 'safe' },
    { id: 'exams', label: 'Exams', tier: 'child-health' },
    { id: 'ask_grandma', label: 'Ask Grandma', tier: 'safe' },
    { id: 'rewards', label: 'Rewards', tier: 'safe' },
    { id: 'essentials', label: 'Essentials card', tier: 'safe' },
  ],
}

const NANNY_KIDS = ['hero-tiles', 'today-summary', 'diaper', 'reminders', 'essentials']
const FAMILY_KIDS = ['hero-tiles', 'essentials']
const PREGNANCY_WATCHER = ['week-hero', 'today_summary', 'essentials']
const CYCLE_WATCHER = ['journey_ring', 'essentials'] // never an intimate card

/**
 * Default shared-card set when `_shared_cards[behavior]` is absent. Parents get
 * every card; caregivers get a role-appropriate, privacy-safe default.
 */
export function roleDefaultCards(behavior: CaregiverBehavior, role: CaregiverRole): string[] {
  if (role === 'parent') return CAREGIVER_CARDS[behavior].map((c) => c.id)
  if (behavior === 'kids') return role === 'nanny' ? [...NANNY_KIDS] : [...FAMILY_KIDS]
  if (behavior === 'pregnancy') return [...PREGNANCY_WATCHER]
  return [...CYCLE_WATCHER]
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- lib/__tests__/caregiverCards.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/caregiverCards.ts lib/__tests__/caregiverCards.test.ts
git commit -m "feat(caregiver): shared-card vocabulary, sensitivity tiers, role defaults"
```

---

## Task 2: `visibleCards` resolver

**Files:**
- Modify: `lib/caregiverPermissions.ts` (add `visibleCards`)
- Test: `lib/__tests__/caregiverPermissions.test.ts` (append cases)

**Interfaces:**
- Consumes: `ChildWithRole`, `roleDefaultCards`, `CaregiverBehavior` from Task 1.
- Produces: `function visibleCards(child: ChildWithRole | null | undefined, behavior: CaregiverBehavior): Set<string>` — the set of card ids a caregiver's home should render. Owner → all cards. Paused → empty set. Otherwise `_shared_cards[behavior]` if present, else `roleDefaultCards`.

- [ ] **Step 1: Write the failing test (append to existing file)**

```ts
// append to lib/__tests__/caregiverPermissions.test.ts
import { visibleCards } from '../caregiverPermissions'
import { CAREGIVER_CARDS } from '../caregiverCards'

describe('visibleCards', () => {
  it('returns every kids card for an owner', () => {
    const owner = child('parent', {})
    const set = visibleCards(owner, 'kids')
    for (const c of CAREGIVER_CARDS.kids) expect(set.has(c.id)).toBe(true)
  })

  it('uses the explicit _shared_cards allowlist when present', () => {
    const nanny = child('nanny', {
      view: true,
      _shared_cards: { kids: ['hero-tiles', 'essentials'] },
    })
    const set = visibleCards(nanny, 'kids')
    expect(set.has('hero-tiles')).toBe(true)
    expect(set.has('essentials')).toBe(true)
    expect(set.has('diaper')).toBe(false)
  })

  it('falls back to role defaults when _shared_cards is absent', () => {
    const nanny = child('nanny', { view: true })
    const set = visibleCards(nanny, 'kids')
    expect(set.has('diaper')).toBe(true) // nanny default
    expect(set.has('health')).toBe(false)
  })

  it('returns an empty set for a paused caregiver', () => {
    const paused = child('nanny', { view: true, _paused: true, _shared_cards: { kids: ['hero-tiles'] } })
    expect(visibleCards(paused, 'kids').size).toBe(0)
  })

  it('returns an empty set for a null child', () => {
    expect(visibleCards(null, 'kids').size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/caregiverPermissions.test.ts`
Expected: FAIL — `visibleCards` is not exported.

- [ ] **Step 3: Implement `visibleCards`**

Append to `lib/caregiverPermissions.ts` (add imports at top):

```ts
import { roleDefaultCards, type CaregiverBehavior } from './caregiverCards'
import { CAREGIVER_CARDS } from './caregiverCards'
```

```ts
/**
 * The set of home card ids a caregiver's surface should render for `behavior`.
 * UX-only (RLS still gates the underlying data). Owner → all; paused → none;
 * else the explicit `_shared_cards` allowlist, or role defaults when absent.
 */
export function visibleCards(
  child: ChildWithRole | null | undefined,
  behavior: CaregiverBehavior,
): Set<string> {
  if (!child) return new Set()
  if (child.caregiverRole === 'parent') {
    return new Set(CAREGIVER_CARDS[behavior].map((c) => c.id))
  }
  const perms = child.permissions
  if (!perms || perms._paused === true) return new Set()
  const explicit = perms._shared_cards?.[behavior]
  return new Set(explicit ?? roleDefaultCards(behavior, child.caregiverRole))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/caregiverPermissions.test.ts`
Expected: PASS (existing + new cases).

- [ ] **Step 5: Commit**

```bash
git add lib/caregiverPermissions.ts lib/__tests__/caregiverPermissions.test.ts
git commit -m "feat(caregiver): visibleCards resolver (allowlist + role-default fallback)"
```

---

## Task 3: Resolve the essentials data source + `useChildEssentials` hook

**Files:**
- Create: `lib/childEssentials.ts` (data fetch + shape)
- Test: `lib/__tests__/childEssentials.test.ts`
- Read first (verification): `lib/vault.ts:150-170`, `supabase/migrations/*emergency*`, `schema.sql`

**Interfaces:**
- Consumes: Supabase client, `children.pediatrician`, `emergency_contacts`, `insurance_plans`.
- Produces:
  - `interface ChildEssentials { childName: string; photoUrl: string | null; allergies: string[]; pediatricianName: string | null; pediatricianPhone: string | null; emergencyContactName: string | null; emergencyContactPhone: string | null; insuranceProvider: string | null; insuranceMemberId: string | null; insurancePhone: string | null }`
  - `function fetchChildEssentials(childId: string, ownerUserId: string): Promise<ChildEssentials>`
  - `function useChildEssentials(childId: string, ownerUserId: string)` (React Query hook, key `['child-essentials', childId]`)

**IMPORTANT — resolve before coding:** The spec flags that `emergency_cards` (used by `lib/vault.ts`) has **no migration** and isn't in `schema.sql`. Step 0 verifies. The plan **routes around it**: pediatrician from `children.pediatrician`, allergies from the child record, emergency contact + insurance from the per-user `emergency_contacts` / `insurance_plans` tables. Do **not** depend on `emergency_cards`.

- [ ] **Step 0: Verify data sources (no code)**

Run: `grep -rn "emergency_cards" supabase/ ; grep -rn "pediatrician" supabase/migrations/ | head; grep -rn "CREATE TABLE" supabase/migrations/20260413050000_emergency_insurance.sql`
Expected: confirm `emergency_contacts` + `insurance_plans` columns and `children.pediatrician`. If `emergency_cards` has no migration, proceed with the per-user tables as planned. Note findings in the commit body.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/childEssentials.test.ts
import { normalizeEssentials } from '../childEssentials'

describe('normalizeEssentials', () => {
  it('maps child + contact + insurance rows into the flat essentials shape', () => {
    const out = normalizeEssentials(
      { name: 'Rio', photo_url: null, allergies: ['peanuts'], pediatrician: { name: 'Dr. Sofia', phone: '119' } },
      { name: 'Ana', phone: '11999' },
      { provider: 'Unimed', member_id: 'X1', phone: '0800' },
    )
    expect(out).toEqual({
      childName: 'Rio',
      photoUrl: null,
      allergies: ['peanuts'],
      pediatricianName: 'Dr. Sofia',
      pediatricianPhone: '119',
      emergencyContactName: 'Ana',
      emergencyContactPhone: '11999',
      insuranceProvider: 'Unimed',
      insuranceMemberId: 'X1',
      insurancePhone: '0800',
    })
  })

  it('tolerates missing contact/insurance/pediatrician (nulls, no throw)', () => {
    const out = normalizeEssentials({ name: 'Rio', photo_url: null, allergies: null, pediatrician: null }, null, null)
    expect(out.pediatricianName).toBeNull()
    expect(out.emergencyContactName).toBeNull()
    expect(out.insuranceProvider).toBeNull()
    expect(out.allergies).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/childEssentials.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the data module**

```ts
// lib/childEssentials.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

export interface ChildEssentials {
  childName: string
  photoUrl: string | null
  allergies: string[]
  pediatricianName: string | null
  pediatricianPhone: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  insuranceProvider: string | null
  insuranceMemberId: string | null
  insurancePhone: string | null
}

type ChildRow = { name: string; photo_url: string | null; allergies: string[] | null; pediatrician: { name?: string; phone?: string } | null }
type ContactRow = { name: string; phone: string } | null
type InsuranceRow = { provider: string; member_id: string; phone: string } | null

/** Pure mapper — unit-tested without the network. */
export function normalizeEssentials(child: ChildRow, contact: ContactRow, insurance: InsuranceRow): ChildEssentials {
  return {
    childName: child.name,
    photoUrl: child.photo_url ?? null,
    allergies: child.allergies ?? [],
    pediatricianName: child.pediatrician?.name ?? null,
    pediatricianPhone: child.pediatrician?.phone ?? null,
    emergencyContactName: contact?.name ?? null,
    emergencyContactPhone: contact?.phone ?? null,
    insuranceProvider: insurance?.provider ?? null,
    insuranceMemberId: insurance?.member_id ?? null,
    insurancePhone: insurance?.phone ?? null,
  }
}

export async function fetchChildEssentials(childId: string, ownerUserId: string): Promise<ChildEssentials> {
  const { data: child, error } = await supabase
    .from('children')
    .select('name, photo_url, allergies, pediatrician')
    .eq('id', childId)
    .single()
  if (error) throw error

  const { data: contact } = await supabase
    .from('emergency_contacts')
    .select('name, phone')
    .eq('user_id', ownerUserId)
    .eq('is_primary', true)
    .maybeSingle()

  const { data: insurance } = await supabase
    .from('insurance_plans')
    .select('provider, member_id, phone')
    .eq('user_id', ownerUserId)
    .limit(1)
    .maybeSingle()

  return normalizeEssentials(child as ChildRow, contact as ContactRow, insurance as InsuranceRow)
}

export function useChildEssentials(childId: string, ownerUserId: string) {
  return useQuery({
    queryKey: ['child-essentials', childId],
    queryFn: () => fetchChildEssentials(childId, ownerUserId),
    enabled: !!childId && !!ownerUserId,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/childEssentials.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/childEssentials.ts lib/__tests__/childEssentials.test.ts
git commit -m "feat(caregiver): child-essentials data module (routes around orphan emergency_cards)"
```

---

## Task 4: `EssentialsWalletCard` component (lite / full)

**Files:**
- Create: `components/home/EssentialsWalletCard.tsx`
- Test: `components/home/__tests__/EssentialsWalletCard.test.tsx`

**Interfaces:**
- Consumes: `useChildEssentials` (Task 3), `useTheme`, `PaperCard`.
- Produces: `function EssentialsWalletCard(props: { childId: string; ownerUserId: string; showFull: boolean; pinned?: boolean }): JSX.Element`. `showFull=false` → lite (name, allergies, pediatrician). `showFull=true` → adds emergency contact + insurance. `pinned` styles it as the pinned caregiver card.

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/__tests__/EssentialsWalletCard.test.tsx
import { render } from '@testing-library/react-native'
import { EssentialsWalletCard } from '../EssentialsWalletCard'

jest.mock('../../../lib/childEssentials', () => ({
  useChildEssentials: () => ({
    data: {
      childName: 'Rio', photoUrl: null, allergies: ['peanuts'],
      pediatricianName: 'Dr. Sofia', pediatricianPhone: '119',
      emergencyContactName: 'Ana', emergencyContactPhone: '11999',
      insuranceProvider: 'Unimed', insuranceMemberId: 'X1', insurancePhone: '0800',
    },
    isLoading: false,
  }),
}))

describe('EssentialsWalletCard', () => {
  it('lite form shows allergies + pediatrician but hides insurance', () => {
    const { queryByText } = render(<EssentialsWalletCard childId="c1" ownerUserId="u1" showFull={false} />)
    expect(queryByText(/peanuts/)).toBeTruthy()
    expect(queryByText(/Dr\. Sofia/)).toBeTruthy()
    expect(queryByText(/Unimed/)).toBeNull()
  })

  it('full form additionally shows emergency contact + insurance', () => {
    const { queryByText } = render(<EssentialsWalletCard childId="c1" ownerUserId="u1" showFull={true} />)
    expect(queryByText(/Ana/)).toBeTruthy()
    expect(queryByText(/Unimed/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/home/__tests__/EssentialsWalletCard.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

```tsx
// components/home/EssentialsWalletCard.tsx
/**
 * EssentialsWalletCard — the unified "child essentials" card in every wallet
 * stack. Lite form (name · allergies · pediatrician) by default; full form
 * (adds emergency contact + insurance) only when the viewer holds `emergency`.
 * For caregivers it renders pinned at the top of their home.
 */
import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme, font, radius } from '../../constants/theme'
import { PaperCard } from '../ui/PaperCard'
import { useChildEssentials } from '../../lib/childEssentials'

interface Props {
  childId: string
  ownerUserId: string
  showFull: boolean
  pinned?: boolean
}

export function EssentialsWalletCard({ childId, ownerUserId, showFull, pinned }: Props) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { data, isLoading } = useChildEssentials(childId, ownerUserId)

  if (isLoading || !data) {
    return (
      <PaperCard radius={radius.lg} padding={16} style={pinned ? styles.pinned : undefined}>
        <Text style={styles.label}>ESSENTIALS</Text>
        <Text style={styles.line}>Loading…</Text>
      </PaperCard>
    )
  }

  return (
    <PaperCard radius={radius.lg} padding={16} style={pinned ? styles.pinned : undefined}>
      <Text style={styles.label}>{data.childName.toUpperCase()}'S CARD</Text>
      {data.allergies.length > 0 && (
        <Text style={styles.line}>⚠️ Allergy: {data.allergies.join(', ')}</Text>
      )}
      {data.pediatricianName && (
        <Text style={styles.line}>🩺 {data.pediatricianName}{data.pediatricianPhone ? ` — ${data.pediatricianPhone}` : ''}</Text>
      )}
      {showFull && data.emergencyContactName && (
        <Text style={styles.line}>🆘 {data.emergencyContactName}{data.emergencyContactPhone ? ` — ${data.emergencyContactPhone}` : ''}</Text>
      )}
      {showFull && data.insuranceProvider && (
        <Text style={styles.line}>💳 {data.insuranceProvider}{data.insuranceMemberId ? ` · ${data.insuranceMemberId}` : ''}</Text>
      )}
    </PaperCard>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    pinned: { marginBottom: 16 },
    label: { fontFamily: font.body, fontSize: 11, letterSpacing: 1.4, color: colors.textMuted, marginBottom: 8 },
    line: { fontFamily: font.body, fontSize: 14, color: colors.text, lineHeight: 24 },
  })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/home/__tests__/EssentialsWalletCard.test.tsx`
Expected: PASS. (If `PaperCard`'s import path differs, fix to the real path; verify with `grep -n "export" components/ui/PaperCard.tsx`.)

- [ ] **Step 5: Commit**

```bash
git add components/home/EssentialsWalletCard.tsx components/home/__tests__/EssentialsWalletCard.test.tsx
git commit -m "feat(caregiver): EssentialsWalletCard (lite/full forms)"
```

---

## Task 5: Add `essentials` to the three wallet builders

**Files:**
- Modify: `lib/kidsWallet.ts` (add `essentials` to id union + builder)
- Modify: `lib/weekWallet.ts` (same)
- Modify: `lib/cycleWallet.ts` (same)
- Test: `lib/__tests__/wallets-essentials.test.ts`

**Interfaces:**
- Consumes: existing `buildKidsWalletCards`, `buildWalletCards`, `buildCycleWalletCards`.
- Produces: each builder emits an `{ id: 'essentials', ... }` descriptor. Read each file first to match its exact descriptor shape (`tone`, `linkOnly`) — Task 5's test asserts presence, not internal tone.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/wallets-essentials.test.ts
import { buildKidsWalletCards } from '../kidsWallet'
import { buildCycleWalletCards } from '../cycleWallet'

describe('essentials card in wallet builders', () => {
  it('kids wallet includes essentials', () => {
    const ids = buildKidsWalletCards({ hasDiaper: false, hasGrowthLeap: false }).map((c) => c.id)
    expect(ids).toContain('essentials')
  })

  it('cycle wallet includes essentials', () => {
    const ids = buildCycleWalletCards().map((c) => c.id)
    expect(ids).toContain('essentials')
  })
})
```

Note: the pregnancy builder (`buildWalletCards`) takes richer inputs; read `lib/weekWallet.ts` for its exact signature, then add an analogous assertion in this test file calling it with the minimal valid input the file shows.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/wallets-essentials.test.ts`
Expected: FAIL — `essentials` not in the emitted ids.

- [ ] **Step 3: Add `essentials` to each builder**

In `lib/kidsWallet.ts`: add `'essentials'` to the `KidsWalletCardId` union, and push `{ id: 'essentials', tone: 'blue', linkOnly: true }` as the FIRST card (before `goals`) so it pins to the top of the stack:

```ts
export type KidsWalletCardId =
  | 'essentials' | 'goals' | 'health' | 'exams' | 'diaper' | 'growth_leap'
  | 'reminders' | 'ask_grandma' | 'rewards'
```
```ts
  const cards: KidsWalletCardDescriptor[] = [
    { id: 'essentials', tone: 'blue', linkOnly: true },
    { id: 'goals', tone: 'yellow', linkOnly: true },
    { id: 'health', tone: 'green', linkOnly: true },
    { id: 'exams', tone: 'lilac', linkOnly: true },
  ]
```

In `lib/weekWallet.ts` and `lib/cycleWallet.ts`: mirror the pattern — add `'essentials'` to the id union and unshift/prepend the descriptor with a valid `tone` for that file and `linkOnly: true`. Read each file's `WalletTone`/descriptor type first and match it exactly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/wallets-essentials.test.ts`
Expected: PASS. Also run the existing wallet tests to confirm no regression: `npm test -- lib/__tests__` (all green).

- [ ] **Step 5: Commit**

```bash
git add lib/kidsWallet.ts lib/weekWallet.ts lib/cycleWallet.ts lib/__tests__/wallets-essentials.test.ts
git commit -m "feat(caregiver): add pinned essentials card to all wallet builders"
```

---

## Task 6: Filter behavior homes through `visibleCards`

**Files:**
- Modify: `components/home/KidsHome.tsx` (accept + apply `visibleCards`)
- Modify: `components/home/PregnancyHome.tsx` (same)
- Modify: `components/home/CycleHome.tsx` (same)
- Modify: `app/(tabs)/index.tsx:47-61` (pass caregiver context instead of routing to thin `CaregiverHome`)

**Interfaces:**
- Consumes: `visibleCards`, `hasCapability`, `CAPABILITY` (Tasks 1–2), `useChildStore.activeChild`, `EssentialsWalletCard`.
- Produces: each home accepts an optional prop `caregiverView?: { visible: Set<string>; canLog: boolean; showFullEssentials: boolean; ownerUserId: string } | null`. When non-null: (a) render only cards whose id is in `visible`; (b) render log entry points inert unless `canLog`; (c) pin `EssentialsWalletCard` at top when `visible.has('essentials')`.

**Approach:** this is the largest task. Each home already computes a card list. Thread the prop and gate each card's render. Do **one home per commit** so a reviewer can approve incrementally — but keep it as one task (shared interface).

- [ ] **Step 1: Establish the caregiver-view selector in `app/(tabs)/index.tsx`**

Replace the current `caregiverRole !== 'parent'` → `<CaregiverHome/>` branch (lines ~47-61) with logic that keeps rendering the behavior home but passes a `caregiverView`:

```tsx
import { visibleCards } from '../../lib/caregiverPermissions'
import { hasCapability, CAPABILITY, isCaregiver } from '../../lib/caregiverPermissions'
// behavior derived from active mode/child as already done in this file
const activeChild = useChildStore((s) => s.activeChild)
const caregiverView = isCaregiver(activeChild)
  ? {
      visible: visibleCards(activeChild, behavior), // behavior: 'kids'|'pregnancy'|'cycle'
      canLog: hasCapability(activeChild, CAPABILITY.LOG_ACTIVITY),
      showFullEssentials: hasCapability(activeChild, CAPABILITY.EMERGENCY),
      ownerUserId: activeChild.parentId ?? activeChild.ownerId, // use the real owner id field on Child
    }
  : null
```
Then pass `caregiverView={caregiverView}` into `KidsHome`/`PregnancyHome`/`CycleHome`. Verify the owner-id field name by reading `types/index.ts` `Child` interface + how boot sets it in `app/_layout.tsx`.

- [ ] **Step 2: Gate cards in `KidsHome.tsx`**

Add `caregiverView` to props. At the top of the render, when `caregiverView` is set, compute `const show = (id: string) => caregiverView.visible.has(id)`. Wrap each first-class card (`hero-tiles`, `today-summary`, wallet) in `{(!caregiverView || show('hero-tiles')) && (...)}`. For the wallet stack, filter the built descriptors: `cards.filter((c) => !caregiverView || show(c.id))`. When `caregiverView && show('essentials')`, render `<EssentialsWalletCard childId={activeChild.id} ownerUserId={caregiverView.ownerUserId} showFull={caregiverView.showFullEssentials} pinned />` ABOVE the stat tiles. Gate log entry points: pass `readOnly={!!caregiverView && !caregiverView.canLog}` into the today-summary/hero-tile log handlers (make the chips inert when read-only).

- [ ] **Step 3: Commit KidsHome**

```bash
git add components/home/KidsHome.tsx app/\(tabs\)/index.tsx
git commit -m "feat(caregiver): filter KidsHome cards through visibleCards + pin essentials"
```

- [ ] **Step 4: Repeat for `PregnancyHome.tsx`**

Same pattern: add `caregiverView`, gate `week-hero`/`daily_message`/`today_summary`/wallet cards, pin essentials, make log pills inert when `!canLog`. Commit:

```bash
git add components/home/PregnancyHome.tsx
git commit -m "feat(caregiver): filter PregnancyHome cards (viewer default)"
```

- [ ] **Step 5: Repeat for `CycleHome.tsx`**

Same pattern. Because Cycle's `journey_ring`/`today_summary` are `intimate`, they are excluded by role defaults — verify a family watcher sees only ring + essentials. Make the ring scrub-only (already display) and today-summary chips inert when `!canLog`. Commit:

```bash
git add components/home/CycleHome.tsx
git commit -m "feat(caregiver): filter CycleHome cards (intimate signals off by default)"
```

- [ ] **Step 6: Manual smoke via dev toggle (deferred)**

Full visual verification happens after Task 8 (dev impersonation). Here, just confirm the app still typechecks: `npm run typecheck` → no new errors.

---

## Task 7: Caregiver tab bar (`getCaregiverTabConfig`)

**Files:**
- Modify: `lib/modeConfig.ts` (add `getCaregiverTabConfig`)
- Modify: `app/(tabs)/_layout.tsx` (select caregiver tabs when active child is a non-owner caregiver relationship)
- Test: `lib/__tests__/caregiverTabs.test.ts`

**Interfaces:**
- Consumes: `CaregiverPermissions`, `hasCapability`.
- Produces: `function getCaregiverTabConfig(permissions: CaregiverPermissions): { home: boolean; grandma: boolean; card: boolean; you: boolean }` — Home always, Grandma only if `chat`, Card always, You always.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/caregiverTabs.test.ts
import { getCaregiverTabConfig } from '../modeConfig'

describe('getCaregiverTabConfig', () => {
  it('shows Grandma only when chat is granted', () => {
    expect(getCaregiverTabConfig({ view: true, log_activity: true, chat: true }).grandma).toBe(true)
    expect(getCaregiverTabConfig({ view: true, log_activity: true, chat: false }).grandma).toBe(false)
  })
  it('always shows home, card, you', () => {
    const c = getCaregiverTabConfig({ view: true, log_activity: false, chat: false })
    expect(c.home).toBe(true)
    expect(c.card).toBe(true)
    expect(c.you).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/caregiverTabs.test.ts`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement `getCaregiverTabConfig`**

Append to `lib/modeConfig.ts`:

```ts
import type { CaregiverPermissions } from '../types'

/**
 * The caregiver tab set: Home / Grandma / Card / You. Grandma is present only
 * when `chat` is granted. Distinct from the owner's 6-slot mode tab config.
 */
export function getCaregiverTabConfig(permissions: CaregiverPermissions) {
  return {
    home: true,
    grandma: permissions.chat === true,
    card: true,
    you: true,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/caregiverTabs.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into `(tabs)/_layout.tsx`**

Read `app/(tabs)/_layout.tsx` first. When `isCaregiver(activeChild)` (gated on `useCaregiverStore.hydrated`), render the caregiver `Tabs.Screen` set (Home → `index`, Grandma → route to `grandma-talk` or a tab that pushes it, Card → a new lightweight `card` route/sheet, You → `settings`) and hide the owner tabs. Use `getCaregiverTabConfig(activeChild.permissions).grandma` to conditionally include the Grandma tab. Keep owner behavior unchanged when not a caregiver. Commit:

```bash
git add lib/modeConfig.ts lib/__tests__/caregiverTabs.test.ts app/\(tabs\)/_layout.tsx
git commit -m "feat(caregiver): Home/Grandma/Card/You tab set gated by chat"
```

- [ ] **Step 6: Create the Card tab target**

Create `app/(tabs)/card.tsx` (or a route the Card tab points to) that renders a full-screen `EssentialsWalletCard` with `showFull={hasCapability(activeChild, CAPABILITY.EMERGENCY)}` and the active child. Commit:

```bash
git add app/\(tabs\)/card.tsx
git commit -m "feat(caregiver): Card tab renders full essentials sheet"
```

---

## Task 8: Invite curation screen (per-section toggles)

**Files:**
- Modify: `app/profile/care-circle.tsx` (add a "What can they see?" editor section)
- Create: `components/caregiver/ShareCardsEditor.tsx` (reusable toggle editor)
- Test: `components/caregiver/__tests__/ShareCardsEditor.test.tsx`

**Interfaces:**
- Consumes: `CAREGIVER_CARDS`, `roleDefaultCards` (Task 1), `CaregiverPermissions`.
- Produces: `function ShareCardsEditor(props: { behavior: CaregiverBehavior; role: CaregiverRole; value: CaregiverPermissions; onChange: (next: CaregiverPermissions) => void }): JSX.Element` — renders a toggle per card (from `CAREGIVER_CARDS[behavior]`) writing `_shared_cards[behavior]`, plus the three capability toggles (`log_activity`/`emergency`/`chat`). Intimate cards render with a "sensitive" flag and are off unless explicitly enabled.

- [ ] **Step 1: Write the failing test**

```tsx
// components/caregiver/__tests__/ShareCardsEditor.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { ShareCardsEditor } from '../ShareCardsEditor'

describe('ShareCardsEditor', () => {
  it('renders a toggle row per card for the behavior', () => {
    const { getByText } = render(
      <ShareCardsEditor behavior="kids" role="nanny"
        value={{ view: true, log_activity: true, chat: false }} onChange={() => {}} />,
    )
    expect(getByText(/Daily stats/)).toBeTruthy()
    expect(getByText(/Diaper tracker/)).toBeTruthy()
  })

  it('toggling a card writes _shared_cards for the behavior', () => {
    const onChange = jest.fn()
    const { getByText } = render(
      <ShareCardsEditor behavior="kids" role="nanny"
        value={{ view: true, log_activity: true, chat: false, _shared_cards: { kids: ['hero-tiles'] } }}
        onChange={onChange} />,
    )
    fireEvent.press(getByText(/Diaper tracker/))
    const next = onChange.mock.calls[0][0]
    expect(next._shared_cards.kids).toContain('diaper')
  })

  it('flags intimate cycle cards as sensitive', () => {
    const { getByText } = render(
      <ShareCardsEditor behavior="cycle" role="family"
        value={{ view: true, log_activity: false, chat: false }} onChange={() => {}} />,
    )
    expect(getByText(/sensitive/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/caregiver/__tests__/ShareCardsEditor.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement `ShareCardsEditor`**

Build the toggle list from `CAREGIVER_CARDS[behavior]`. Current selection = `value._shared_cards?.[behavior] ?? roleDefaultCards(behavior, role)`. Each row toggles the id in/out and calls `onChange({ ...value, _shared_cards: { ...value._shared_cards, [behavior]: nextIds } })`. Render `tier === 'intimate'` rows with a small "sensitive" label. Below the card list, render three capability toggles binding `value.log_activity` / `value.emergency` / `value.chat`. Use `PaperCard` + existing toggle-row styling (match `app/profile/care-circle.tsx` toggles). Import tokens from `constants/theme.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/caregiver/__tests__/ShareCardsEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount in `care-circle.tsx`**

In the member-edit flow of `app/profile/care-circle.tsx`, render `<ShareCardsEditor>` bound to the member's permissions, and on save persist the full `permissions` (capabilities + `_shared_cards`) via the existing `child_caregivers` update path. Confirm the write includes `_shared_cards`. Commit:

```bash
git add app/profile/care-circle.tsx components/caregiver/ShareCardsEditor.tsx components/caregiver/__tests__/ShareCardsEditor.test.tsx
git commit -m "feat(caregiver): per-section share editor wired into care-circle"
```

---

## Task 9: Dev impersonation ("Simulate Caregiver")

**Files:**
- Modify: `lib/devSeed.ts` (add `simulateCaregiver` helper)
- Modify: `app/dev-panel.tsx` (add "SIMULATE CAREGIVER" section)

**Interfaces:**
- Consumes: `useChildStore`, `useCaregiverStore`, `roleDefaultCards`, `CAREGIVER_CARDS`.
- Produces: `function simulateCaregiver(opts: { behavior: CaregiverBehavior; role: CaregiverRole; canLog: boolean; emergency: boolean; chat: boolean }): void` — mutates the active child in `useChildStore` to `caregiverRole=role` with a permissions JSONB (capabilities + `_shared_cards` from role defaults), and `useCaregiverStore.setAccountRole(role)`. Plus `resetToParent(): void`.

- [ ] **Step 1: Implement the dev helper**

Add to `lib/devSeed.ts`:

```ts
import { useChildStore } from '../store/useChildStore'
import { useCaregiverStore } from '../store/useCaregiverStore'
import { roleDefaultCards, type CaregiverBehavior } from './caregiverCards'
import type { CaregiverRole } from '../types'

/** DEV ONLY — flip the active child into a caregiver relationship so the whole
 * caregiver surface renders without a second account. Does NOT touch Supabase
 * (RLS still governs real reads); this only changes local UX state. */
export function simulateCaregiver(opts: {
  behavior: CaregiverBehavior
  role: CaregiverRole
  canLog: boolean
  emergency: boolean
  chat: boolean
}): void {
  const { activeChild, children, setChildren, setActiveChild } = useChildStore.getState()
  if (!activeChild) return
  const patched = {
    ...activeChild,
    caregiverRole: opts.role,
    permissions: {
      view: true,
      log_activity: opts.canLog,
      chat: opts.chat,
      emergency: opts.emergency,
      _shared_cards: { [opts.behavior]: roleDefaultCards(opts.behavior, opts.role) },
    },
  }
  setChildren(children.map((c) => (c.id === patched.id ? patched : c)))
  setActiveChild(patched)
  useCaregiverStore.getState().setAccountRole(opts.role)
}

export function resetToParentSim(): void {
  const { activeChild, children, setChildren, setActiveChild } = useChildStore.getState()
  if (!activeChild) return
  const patched = { ...activeChild, caregiverRole: 'parent' as CaregiverRole, permissions: { view: true, log_activity: true, chat: true, emergency: true } }
  setChildren(children.map((c) => (c.id === patched.id ? patched : c)))
  setActiveChild(patched)
  useCaregiverStore.getState().setAccountRole('parent')
}
```

Verify `useChildStore` exposes `setChildren`/`setActiveChild`/`children` (it does per recon); adapt names if different.

- [ ] **Step 2: Add the Dev Panel section**

In `app/dev-panel.tsx`, add a `<Section title="SIMULATE CAREGIVER">` with `ActionRow`s:
- "Become Nanny (Kids)" → `simulateCaregiver({ behavior: 'kids', role: 'nanny', canLog: true, emergency: false, chat: true })`
- "Become Family (Kids, viewer)" → `simulateCaregiver({ behavior: 'kids', role: 'family', canLog: false, emergency: false, chat: false })`
- "Become Pregnancy watcher" → `{ behavior: 'pregnancy', role: 'family', canLog: false, emergency: false, chat: false }`
- "Become Cycle watcher" → `{ behavior: 'cycle', role: 'family', canLog: false, emergency: false, chat: false }`
- "Edit shared cards" → `router.push('/profile/care-circle')`
- "Reset to parent" → `resetToParentSim()`

Each wrapped in the existing `run()` handler that shows a result Alert and dismisses the panel so you land on the caregiver home.

- [ ] **Step 3: Typecheck + manual walk**

Run: `npm run typecheck` → no new errors. Then in the running app: open Dev Panel → SIMULATE CAREGIVER → "Become Nanny (Kids)" → confirm the home renders the nanny's shared cards with essentials pinned, "Log the day" present; tab bar = Home/Grandma/Card/You. Try "Become Family" → confirm viewer (no log), no Grandma tab. Try Cycle watcher → confirm only ring + essentials, no intimate signals.

- [ ] **Step 4: Commit**

```bash
git add lib/devSeed.ts app/dev-panel.tsx
git commit -m "feat(caregiver): dev 'Simulate Caregiver' panel to walk the flow"
```

---

## Task 10: Correct the stale docs

**Files:**
- Modify: `CLAUDE.md` (the `care` "scaffold-only" note)

- [ ] **Step 1: Update the note**

In `CLAUDE.md`, replace the standing decision that says the `care` (Caregiver) mode is scaffold-only with an accurate description: **`care` as a 4th `JourneyMode` remains scaffold-only (tokens only), but the caregiver *persona* system (invite/accept, per-child role + permissions, PHI-masked boot, filtered behavior home, per-section `_shared_cards` sharing, Home/Grandma/Card/You tabs, unified essentials wallet card) is fully built.** Point to `docs/superpowers/specs/2026-07-19-caregiver-experience-design.md`.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(caregiver): correct stale 'care scaffold-only' note"
```

---

## Self-Review

**Spec coverage:**
- §2 share model → Tasks 1 (types/defaults) + 2 (resolver) ✓
- §3 invite screen → Task 8 ✓
- §4 essentials wallet card → Tasks 3 (data) + 4 (component) + 5 (builders) ✓
- §5 filtered home → Task 6 ✓
- §6 caregiver tabs → Task 7 ✓
- §7 dev impersonation → Task 9 ✓
- §8 build order → Tasks ordered to match ✓
- §9 privacy (RLS unchanged, cycle intimate off, emergency-gated insurance) → enforced in Tasks 1 (tiers/defaults), 2 (paused→empty), 4 (showFull), 8 (sensitive flag) ✓
- §0 docs correction → Task 10 ✓

**Placeholder scan:** No "TBD/handle edge cases/similar to Task N". Two deliberate *verification* steps (Task 3 Step 0, and "read the file first" for wallet tones / owner-id field) are genuine unknowns in the existing code, not hand-waves — each says exactly what to check and what to do with the result.

**Type consistency:** `visibleCards(child, behavior)` used consistently (Tasks 2, 6). `CaregiverBehavior` defined in Task 1, imported in 2/3/9. `roleDefaultCards` signature stable across 1/2/8/9. `EssentialsWalletCard` props (`childId/ownerUserId/showFull/pinned`) identical in Tasks 4/6/7. `_shared_cards` shape identical in types (Task 1) and every consumer.

**Open verification flagged for the implementer:** (a) `emergency_cards` orphan → route around it (Task 3 Step 0); (b) `Child` owner-id field name for `ownerUserId` (Task 6 Step 1); (c) exact `WalletTone` per builder (Task 5); (d) `useChildStore` setter names (Task 9). All have explicit "read X first" instructions.
