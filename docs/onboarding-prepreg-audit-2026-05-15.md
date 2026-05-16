# Pre-Pregnancy (Cycle) Onboarding Audit — 2026-05-15

**Scope:** `app/onboarding/cycle/{_layout,index}.tsx`, `store/useCycleOnboardingStore.ts`, `lib/cycleLogic.ts`, `lib/cycleAnalytics.ts`.

---

## 1. Flow Map

### Base (5 steps, all users)
| # | Step | Input | Validation | Skippable |
|---|------|-------|-----------|-----------|
| 1 | `last_period` | `DatePickerField` bounded [today−90d, today] | must pick to continue | Yes |
| 2 | `cycle_length` | TextInput 1–60 + "I don't know" chip + TTC toggle | none | No |
| 3 | `period_duration` | Chip grid: 3,4,5,6,7,8 | default=5 | No |
| 4 | `conditions` | Multi-select PCOS / Endo / Other / Prefer-not-say | none | Yes |
| 5 | `temp_unit` | Toggle °C / °F | default celsius | No |

### TTC branch (`tryingToConceive=true`)
| # | Step | Input | Skippable |
|---|------|-------|-----------|
| 6 | `ttc_duration` | Chips: Just starting / A few months / Over a year | Yes |
| 7 | `ttc_temperature` | Yes / Not yet | No |
| 8 | `ttc_supplements` | Multiline free text | Yes |

Then: `complete` → `CompletionScreen` → "Let's Go" → `saveAndFinish()`.

---

## 2. Edge Values

- **cycleLength clamp `Math.max(1, Math.min(60, n))`:** values 1–20 are medically impossible. cycleLength<15 → `ovulationDay = cycleLength-14 ≤ 1` → ovulation phase fires during menstruation. Math silently breaks.
- **cycleLength=21:** correct math (short normal cycle).
- **cycleLength=45 (PCOS):** `lutealPhase` is hardcoded `14` in `DEFAULT_CONFIG` → 30-day "luteal" phase. Engine is mathematically correct *for the config*, but content does not adapt to long cycles.
- **"I don't know":** stores `cycleLength=null`, `cycleLengthUnknown=true`. Latter is never persisted. JSON blob in `cycle_logs.notes` carries `cycleLength: null`. `getCycleInfo` falls back to `DEFAULT_CONFIG.cycleLength=28` silently.
- **LMP today:** allowed, cycleDay=1, menstruation. Correct.
- **LMP future:** blocked by `maximumDate`.
- **LMP >90d ago:** blocked by `minimumDate`.
- **periodDuration chips:** only 3–8 — no 1–2d (PCOS / spotting) or 9+d (menorrhagia) entry.

---

## 3. Math Correctness — sample LMP=2026-04-15, cycleLength=28, today=2026-05-15

```
daysSincePeriod = 30
cycleDay = 30 % 28 + 1 = 3
ovulationDay = 28 - 14 = 14
fertileStart = max(1, 14-5) = 9; fertileEnd = 14+1 = 15
phase = menstruation (cycleDay 3 ≤ periodLength 5) ✓
currentCycleStart = 2026-05-13 ✓
nextPeriodDate = 2026-06-10 ✓
ovulationDate = 2026-05-26 ✓
daysUntilPeriod = 26 ✓
```

Core math is correct.

**Color violations in `cycleLogic.ts`:**
- `:185` `getEmptyCycleInfo.phaseColor = '#C4B5FD'` (raw hex)
- `:228-231` `getPhaseColor` returns neon legacy `#FF6B6B / #FF8AD8 / #A2FF86 / #B983FF`
- `:341-345` `getMonthCycleDots` neon hex
- `:365-369` `getHydrationLevel` neon hex

---

## 4. Persistence Map

| Field | Step | Written to Supabase? | Where | Read back? |
|-------|------|---------------------|-------|------------|
| `lastPeriodDate` | 1 | ✅ | `cycle_logs.date` as `period_start` | Yes |
| `periodDuration` | 3 | ✅ | `cycle_logs.value` | Yes |
| `cycleLength` | 2 | JSON blob | `cycle_logs.notes` | **No** |
| `cycleLengthUnknown` | 2 | **No** | nowhere | — |
| `conditions` | 4 | JSON blob | `cycle_logs.notes` | **No** |
| `tempUnit` | 5 | JSON blob | `cycle_logs.notes` | **No** |
| `tryingToConceive` | 2 | JSON blob + local | `cycle_logs.notes`, `useModeStore.cycleIntent` | partial |
| `tryingDuration` | 6 | JSON blob | `cycle_logs.notes` | **No** |
| `trackingTemperature` | 7 | JSON blob | `cycle_logs.notes` | **No** |
| `supplements` | 8 | JSON blob | `cycle_logs.notes` | **No** |
| `journey_mode` | — | **No** | `profiles` upsert at `:106-108` writes only `{ id: userId }` | — |

**8 of 10 collected fields are write-only.** `profiles.upsert` is a no-op.

---

## 5. Resumability

No `persist` middleware (intentional). App kill → restart from step 1. Acceptable. **Retry after a Supabase write failure inserts duplicate `period_start` rows** (insert, not upsert).

---

## 6. Mode + Journey Wiring

**Local mode — fragile correctness:**
`:140-141` calls `setCycleIntent(...)` + `setMode('pre-pregnancy')`. Then `onboardingComplete()` runs, which internally `setMode(enrolledBehaviors[0])`. If `useBehaviorStore.enroll('pre-pregnancy')` was not called (it isn't in this file), `enrolledBehaviors[0]` is either undefined or a different behavior — silently overrides the pre-pregnancy mode set 3 lines earlier.

**Server mode — broken:**
`profiles.journey_mode` never updated. Migration default is `'kids'`. Every cold restart → `_layout.tsx:141-143` reads `profile?.journey_mode` → resets to `'kids'`.

**`behaviors` insert:** `type: 'cycle'` (not `'pre-pregnancy'`), bridged by remap at `_layout.tsx:225`. Fragile.

---

## 7. Design System Violations

| Location | Issue | Severity |
|---|---|---|
| `index.tsx:853` | `color: '#FFFFFF'` hardcoded | P2 |
| `index.tsx:657-658` | Completion CTA uses `colors.primary` (purple) — should be rose `getModeColor('pre-pregnancy')` | P1 |
| `index.tsx:657` | CTA `borderRadius: radius.lg` — must be `radius.full` | P1 |
| `index.tsx:689-690` (TogglePill) | Active state = purple instead of rose | P1 |
| `index.tsx:438, 529` chips | Active state = purple | P1 |
| `cycleLogic.ts:185, 228-231, 341-345, 365-369` | Neon legacy hex throughout | P2 |
| `index.tsx:761, 770` | duration chip uses `radius.lg`, condition chip uses `radius.full` — inconsistent | P2 |

No glow shadows, no `GlassCard` — those parts correct.

---

## 8. i18n + a11y

- **i18n:** zero `t()` calls. All English.
- **a11y:** no `accessibilityLabel`/`Role` anywhere. `conditionChip` height ~39pt (<44pt). `durationChip` ~44pt borderline.

---

## Top 3 Fixes

1. **Write `journey_mode: 'pre-pregnancy'` to `profiles`** (`index.tsx:106-108`) — without this, mode is lost on every cold restart.
2. **Migrate cycle prefs (`cycleLength`, `conditions`, `tempUnit`, TTC) out of the JSON blob into queryable columns and read them in `CycleHome`** — currently all preferences are write-only.
3. **Apply `getModeColor('pre-pregnancy', isDark)` to all active states + completion CTA** — flow currently renders in global purple, violating the rose mode identity.
