# Rich Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tags, notes, checklist, and priority to the shared reminders; a filter-chip row + tap-to-detail in the sheet; and a next-1–2 inline preview in the pregnancy + cycle wallet cards. All behaviors inherit it via the shared `UserReminders`.

**Architecture:** Extract types + pure helpers into `lib/reminders.ts` (unit-tested), then extend the shared `components/home/UserReminders.tsx` (composer + filter + detail) and read the wallet preview via the shared helpers. Local AsyncStorage only, fully back-compatible with existing stored reminders.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript strict, AsyncStorage, Jest (`jest-expo`). Lucide icons, `constants/theme.ts` tokens.

## Global Constraints

- Design system: import tokens from `constants/theme.ts` (`useTheme()` → `colors`, `stickers`, `radius`, `font`; `useDiffuseTheme()` under Diffuse). No raw hex in JSX (rgba scrims ok). Tag chips + filter chips are NEUTRAL (ink hairline / soft neutral fill) — the mode/behavior color is for small accents only, NOT tag fills.
- TypeScript strict — no `any`, no implicit returns.
- Storage: keep the existing key `grandma-reminders-${context}-${userId}` (AsyncStorage). New reminder fields are all OPTIONAL — existing stored reminders must parse unchanged.
- Local dates: use the file's existing `localDateStr(d: Date)` helper; never `toISOString().split`.
- Reminders still mirror to the `notifications` table on add (existing behavior) — do NOT change that; new fields (tags/notes/checklist/priority) are app-local only.
- Tests: `lib/__tests__/reminders.test.ts`, run `npx jest lib/__tests__/reminders.test.ts`.
- Commit after every task, trailer exactly: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Work on `main`. A parallel session edits other files — stage ONLY the files each task names (explicit `git add <paths>`), never `git add -A`, never `git stash`.
- `JourneyMode = 'pre-pregnancy' | 'pregnancy' | 'kids'` from `types/index.ts`.

## File Structure

| File | Responsibility |
|---|---|
| `lib/reminders.ts` | `Reminder`, `ChecklistItem` types + pure helpers (`storageKey`, `loadReminders`, `saveReminders`, `upcomingReminders`, `allTags`). Single source of truth. |
| `lib/__tests__/reminders.test.ts` | Unit tests for the pure helpers. |
| `components/home/UserReminders.tsx` | Consume the shared types; extend composer (tags/notes/priority), add filter chips, add reminder detail (notes + checklist + tags). Keep compact row + horizontal actions. |
| `components/home/pregnancy/WeekWallet.tsx` | Reminders wallet card previews next 1–2. |
| `components/home/cycle/CycleWallet.tsx` | Same preview. |
| `lib/i18n/keys.ts` + 12 locale files | New copy keys. |

---

### Task 1: `lib/reminders.ts` types + pure helpers

**Files:**
- Create: `lib/reminders.ts`
- Test: `lib/__tests__/reminders.test.ts`

**Interfaces:**
- Produces:
  - `interface ChecklistItem { id: string; text: string; done: boolean }`
  - `interface Reminder { id: string; text: string; done: boolean; dueDate?: string | null; dueTime?: string | null; notifId?: string | null; archivedAt?: string | null; flagged?: boolean; tags?: string[]; notes?: string; checklist?: ChecklistItem[]; priority?: 'low' | 'med' | 'high' }`
  - `storageKey(userId: string | null, context: JourneyMode): string | null`
  - `loadReminders(userId: string | null, context: JourneyMode): Promise<Reminder[]>`
  - `saveReminders(userId: string | null, context: JourneyMode, list: Reminder[]): Promise<void>`
  - `upcomingReminders(list: Reminder[], n: number): Reminder[]`
  - `allTags(list: Reminder[]): string[]`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/reminders.test.ts
import { upcomingReminders, allTags, type Reminder } from '../reminders'

const r = (over: Partial<Reminder>): Reminder => ({ id: Math.random().toString(), text: 't', done: false, ...over })

describe('upcomingReminders', () => {
  it('excludes done, sorts dated-before-undated, then by date asc, limits to n', () => {
    const list = [
      r({ id: 'a', dueDate: '2026-07-20' }),
      r({ id: 'b', done: true, dueDate: '2026-07-10' }),
      r({ id: 'c', dueDate: '2026-07-15' }),
      r({ id: 'd', dueDate: null }),
    ]
    const out = upcomingReminders(list, 2)
    expect(out.map((x) => x.id)).toEqual(['c', 'a']) // b excluded (done), d after dated, limit 2
  })
  it('flagged sorts before unflagged among undated', () => {
    const list = [r({ id: 'x', dueDate: null }), r({ id: 'y', dueDate: null, flagged: true })]
    expect(upcomingReminders(list, 5).map((x) => x.id)).toEqual(['y', 'x'])
  })
  it('returns [] for empty input', () => {
    expect(upcomingReminders([], 2)).toEqual([])
  })
})

describe('allTags', () => {
  it('dedupes and preserves first-seen order', () => {
    const list = [r({ tags: ['health', 'daily'] }), r({ tags: ['daily', 'appt'] }), r({ tags: [] })]
    expect(allTags(list)).toEqual(['health', 'daily', 'appt'])
  })
  it('handles reminders with no tags field (back-compat)', () => {
    expect(allTags([r({})])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/reminders.test.ts`
Expected: FAIL — cannot find module `../reminders`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/reminders.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { JourneyMode } from '../types'

export interface ChecklistItem { id: string; text: string; done: boolean }

export interface Reminder {
  id: string
  text: string
  done: boolean
  dueDate?: string | null
  dueTime?: string | null
  notifId?: string | null
  archivedAt?: string | null
  flagged?: boolean
  // rich fields (all optional, back-compat):
  tags?: string[]
  notes?: string
  checklist?: ChecklistItem[]
  priority?: 'low' | 'med' | 'high'
}

export function storageKey(userId: string | null, context: JourneyMode): string | null {
  return userId ? `grandma-reminders-${context}-${userId}` : null
}

export async function loadReminders(userId: string | null, context: JourneyMode): Promise<Reminder[]> {
  const key = storageKey(userId, context)
  if (!key) return []
  const json = await AsyncStorage.getItem(key)
  if (!json) return []
  try { return JSON.parse(json) as Reminder[] } catch { return [] }
}

export async function saveReminders(userId: string | null, context: JourneyMode, list: Reminder[]): Promise<void> {
  const key = storageKey(userId, context)
  if (key) await AsyncStorage.setItem(key, JSON.stringify(list))
}

// Not-done reminders, soonest first. Dated before undated; among dated by date
// asc; among undated, flagged first; stable id order otherwise. Limited to n.
export function upcomingReminders(list: Reminder[], n: number): Reminder[] {
  return list
    .filter((r) => !r.done)
    .slice()
    .sort((a, b) => {
      const ad = a.dueDate ?? null
      const bd = b.dueDate ?? null
      if (ad && bd) return ad < bd ? -1 : ad > bd ? 1 : 0
      if (ad && !bd) return -1
      if (!ad && bd) return 1
      // both undated: flagged first
      if (!!a.flagged !== !!b.flagged) return a.flagged ? -1 : 1
      return 0
    })
    .slice(0, n)
}

export function allTags(list: Reminder[]): string[] {
  const seen: string[] = []
  for (const r of list) for (const tag of r.tags ?? []) if (!seen.includes(tag)) seen.push(tag)
  return seen
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/reminders.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/reminders.ts lib/__tests__/reminders.test.ts
git commit -m "feat(reminders): shared types + pure helpers (upcoming, allTags, load/save)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: New i18n keys

**Files:**
- Modify: `lib/i18n/keys.ts`
- Modify: `lib/i18n/en.ts` + the 11 other locale files (`es, pt-BR, de, it, fr, ja, zh, ar, hi, ko, tr`)

**Interfaces:**
- Produces translation keys: `reminders_tagsLabel`, `reminders_addTag`, `reminders_notesLabel`, `reminders_notesPlaceholder`, `reminders_checklistLabel`, `reminders_addChecklistItem`, `reminders_priorityLabel`, `reminders_priorityLow`, `reminders_priorityMed`, `reminders_priorityHigh`, `reminders_filterAll`, `reminders_checklistCount` (`"{{done}}/{{total}}"`).

- [ ] **Step 1: Add the interface keys**

In `lib/i18n/keys.ts`, find the reminders key block (search `preg_reminders_addButton`) and add after it:

```ts
  reminders_tagsLabel: string
  reminders_addTag: string
  reminders_notesLabel: string
  reminders_notesPlaceholder: string
  reminders_checklistLabel: string
  reminders_addChecklistItem: string
  reminders_priorityLabel: string
  reminders_priorityLow: string
  reminders_priorityMed: string
  reminders_priorityHigh: string
  reminders_filterAll: string
  reminders_checklistCount: string
```

- [ ] **Step 2: Add English strings**

In `lib/i18n/en.ts`, after the `preg_reminders_addButton` line, add:

```ts
  reminders_tagsLabel: 'Tags',
  reminders_addTag: 'Add tag',
  reminders_notesLabel: 'Notes',
  reminders_notesPlaceholder: 'Add a note…',
  reminders_checklistLabel: 'Checklist',
  reminders_addChecklistItem: 'Add item',
  reminders_priorityLabel: 'Priority',
  reminders_priorityLow: 'Low',
  reminders_priorityMed: 'Medium',
  reminders_priorityHigh: 'High',
  reminders_filterAll: 'All',
  reminders_checklistCount: '{{done}}/{{total}}',
```

- [ ] **Step 3: Placehold across the other 11 locales**

Run this script (inserts the same English strings after each locale's `preg_reminders_addButton:` line, skipping any that already have the keys):

```bash
node -e '
const fs=require("fs");
const files=["es","pt-BR","de","it","fr","ja","zh","ar","hi","ko","tr"].map(l=>"lib/i18n/"+l+".ts");
const block=[
  "  reminders_tagsLabel: \x27Tags\x27,",
  "  reminders_addTag: \x27Add tag\x27,",
  "  reminders_notesLabel: \x27Notes\x27,",
  "  reminders_notesPlaceholder: \x27Add a note…\x27,",
  "  reminders_checklistLabel: \x27Checklist\x27,",
  "  reminders_addChecklistItem: \x27Add item\x27,",
  "  reminders_priorityLabel: \x27Priority\x27,",
  "  reminders_priorityLow: \x27Low\x27,",
  "  reminders_priorityMed: \x27Medium\x27,",
  "  reminders_priorityHigh: \x27High\x27,",
  "  reminders_filterAll: \x27All\x27,",
  "  reminders_checklistCount: \x27{{done}}/{{total}}\x27,",
].join("\n");
for(const f of files){
  if(!fs.existsSync(f))continue;
  let src=fs.readFileSync(f,"utf8");
  if(src.includes("reminders_filterAll"))continue;
  const lines=src.split("\n");
  const idx=lines.findIndex(l=>l.trim().startsWith("preg_reminders_addButton:"));
  if(idx===-1){console.log("NO ANCHOR "+f);continue;}
  lines.splice(idx+1,0,block);
  fs.writeFileSync(f,lines.join("\n"));
}
console.log("done");
'
```

Expected: prints `done` (or `NO ANCHOR <file>` — if so, insert manually after that file's first reminders key).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "i18n|reminders_" | head`
Expected: no errors (every locale now has all 12 keys).

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/keys.ts lib/i18n/en.ts lib/i18n/es.ts lib/i18n/pt-BR.ts lib/i18n/de.ts lib/i18n/it.ts lib/i18n/fr.ts lib/i18n/ja.ts lib/i18n/zh.ts lib/i18n/ar.ts lib/i18n/hi.ts lib/i18n/ko.ts lib/i18n/tr.ts
git commit -m "i18n(reminders): tag/notes/checklist/priority/filter keys

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: UserReminders consumes shared types + helpers

**Files:**
- Modify: `components/home/UserReminders.tsx`

**Interfaces:**
- Consumes: `lib/reminders.ts` (`Reminder`, `ChecklistItem`, `storageKey`, `loadReminders`, `saveReminders`).
- Produces: no external API change (same `Props`); internal refactor only.

This task is a pure refactor (no behavior change) so the later UI tasks build on the shared types. It must stay green with existing reminders.

- [ ] **Step 1: Replace the local Reminder interface with the shared import**

In `components/home/UserReminders.tsx`:
- Delete the local `interface Reminder { … }` block (currently lines ~33–42).
- Add to the imports: `import { type Reminder, type ChecklistItem, storageKey as buildStorageKey, loadReminders, saveReminders } from '../../lib/reminders'`
- Replace the inline `const storageKey = userId ? \`grandma-reminders-${context}-${userId}\` : null` with `const storageKey = buildStorageKey(userId, context)`.
- Replace the `useEffect` load body to use the helper:
  ```ts
  useEffect(() => {
    let alive = true
    loadReminders(userId, context).then((list) => { if (alive) setReminders(list) })
    return () => { alive = false }
  }, [userId, context])
  ```
- Replace `persist` to use the helper:
  ```ts
  function persist(list: Reminder[]) {
    setReminders(list)
    void saveReminders(userId, context, list)
  }
  ```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep UserReminders || echo clean`
Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add components/home/UserReminders.tsx
git commit -m "refactor(reminders): UserReminders uses shared lib/reminders types + helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Composer — tags, notes, priority on add

**Files:**
- Modify: `components/home/UserReminders.tsx`

**Interfaces:**
- Consumes: `Reminder`, `ChecklistItem` (Task 1).
- Produces: reminders created with optional `tags`, `notes`, `priority`.

- [ ] **Step 1: Add composer state**

Near the other `useState`s (after `showTimePicker`), add:

```ts
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'med' | 'high' | null>(null)
```

- [ ] **Step 2: Persist the new fields in `addReminder`**

In `addReminder`, change the `const r: Reminder = { … }` object to include the rich fields (only when set):

```ts
    const r: Reminder = {
      id: Date.now().toString(),
      text: newText.trim(),
      done: false,
      dueDate,
      dueTime,
      notifId,
      ...(newTags.length ? { tags: newTags } : {}),
      ...(newNotes.trim() ? { notes: newNotes.trim() } : {}),
      ...(newPriority ? { priority: newPriority } : {}),
    }
    persist([...reminders, r])
    setNewText(''); setNewDate(null); setNewTime(null)
    setNewTags([]); setTagDraft(''); setNewNotes(''); setNewPriority(null)
    setShowDatePicker(false); setShowTimePicker(false); setShowInput(false)
```

(Replace the existing reset lines at the end of `addReminder` with the block above.)

- [ ] **Step 3: Render the composer additions**

Inside the composer JSX (the block shown when `showInput`, near the existing date/time chips), add — using theme tokens, neutral chips:

```tsx
{/* Tags — neutral hairline chips + inline add */}
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
  {newTags.map((tag) => (
    <Pressable key={tag} onPress={() => setNewTags((prev) => prev.filter((x) => x !== tag))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.text, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: colors.text }}>{tag}</Text>
      <X size={11} color={colors.textMuted} strokeWidth={2.5} />
    </Pressable>
  ))}
  <TextInput
    value={tagDraft}
    onChangeText={setTagDraft}
    placeholder={t('reminders_addTag')}
    placeholderTextColor={colors.textFaint}
    onSubmitEditing={() => {
      const v = tagDraft.trim().toLowerCase()
      if (v && !newTags.includes(v)) setNewTags((prev) => [...prev, v])
      setTagDraft('')
    }}
    returnKeyType="done"
    blurOnSubmit={false}
    style={{ minWidth: 90, fontFamily: font.bodyMedium, fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}
  />
</View>

{/* Priority — three neutral pills */}
<View style={{ flexDirection: 'row', gap: 6 }}>
  {(['low', 'med', 'high'] as const).map((p) => {
    const on = newPriority === p
    return (
      <Pressable key={p} onPress={() => setNewPriority(on ? null : p)}
        style={{ borderWidth: 1, borderColor: on ? colors.text : colors.border, backgroundColor: on ? colors.surfaceRaised : 'transparent', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: on ? colors.text : colors.textMuted }}>
          {p === 'low' ? t('reminders_priorityLow') : p === 'med' ? t('reminders_priorityMed') : t('reminders_priorityHigh')}
        </Text>
      </Pressable>
    )
  })}
</View>

{/* Notes */}
<TextInput
  value={newNotes}
  onChangeText={setNewNotes}
  placeholder={t('reminders_notesPlaceholder')}
  placeholderTextColor={colors.textFaint}
  multiline
  style={{ fontFamily: font.body, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 }}
/>
```

Confirm `TextInput`, `Pressable`, `Text`, `View` are imported from `react-native` and `X` from `lucide-react-native` (X is already used by the row actions).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep UserReminders || echo clean`
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add components/home/UserReminders.tsx
git commit -m "feat(reminders): composer adds tags, notes, priority

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Filter chips + tag chips on rows

**Files:**
- Modify: `components/home/UserReminders.tsx`

**Interfaces:**
- Consumes: `allTags` (Task 1); the `active` list.
- Produces: an `activeFilter` state that narrows the rendered list.

- [ ] **Step 1: Add filter state + derived tags/list**

After `const active = reminders.filter((r) => !r.done)`, add:

```ts
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const tagList = allTags(reminders)
  const shownActive = activeFilter ? active.filter((r) => (r.tags ?? []).includes(activeFilter)) : active
```

Add `allTags` to the `lib/reminders` import. Replace the render that maps `active` with `shownActive`.

- [ ] **Step 2: Render the filter chip row (only when tags exist)**

Just above the reminders list render, add:

```tsx
{tagList.length > 0 && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
    {[null, ...tagList].map((tag) => {
      const on = activeFilter === tag
      const label = tag === null ? t('reminders_filterAll') : tag
      return (
        <Pressable key={tag ?? '__all__'} onPress={() => setActiveFilter(tag)}
          style={{ borderWidth: 1, borderColor: on ? colors.text : colors.border, backgroundColor: on ? colors.surfaceRaised : 'transparent', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: on ? colors.text : colors.textMuted }}>{label}</Text>
        </Pressable>
      )
    })}
  </ScrollView>
)}
```

Confirm `ScrollView` is imported from `react-native`.

- [ ] **Step 3: Show each reminder's tags in its row**

In the `ReminderItem` component, in the content column (after the title / due chip), render tag chips + a checklist count when present:

```tsx
{(r.tags ?? []).length > 0 && (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
    {(r.tags ?? []).map((tag) => (
      <View key={tag} style={{ borderWidth: 1, borderColor: diffuse ? dt.colors.line : colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, fontSize: 10, color: diffuse ? dt.colors.ink3 : colors.textMuted }}>{tag}</Text>
      </View>
    ))}
    {r.checklist && r.checklist.length > 0 && (
      <View style={{ borderWidth: 1, borderColor: diffuse ? dt.colors.line : colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, fontSize: 10, color: diffuse ? dt.colors.ink3 : colors.textMuted }}>
          {t('reminders_checklistCount', { done: r.checklist.filter((c) => c.done).length, total: r.checklist.length })}
        </Text>
      </View>
    )}
  </View>
)}
```

`ReminderItem` already receives `diffuse`, `dt`, `colors`, `t` as props — confirm and pass any missing (`diffuseFont` is a module import in this file).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep UserReminders || echo clean`
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add components/home/UserReminders.tsx
git commit -m "feat(reminders): tag filter chips + per-row tag/checklist labels

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Reminder detail — notes + checklist + tags editing

**Files:**
- Modify: `components/home/UserReminders.tsx`

**Interfaces:**
- Consumes: `Reminder`, `ChecklistItem` (Task 1); the existing `persist`.
- Produces: an expandable detail on each reminder that edits notes, checklist, tags; new handlers `updateReminder(id, patch)`.

- [ ] **Step 1: Add a generic update handler**

Near `editReminder`, add:

```ts
  function updateReminder(id: string, patch: Partial<Reminder>) {
    persist(reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
```

Pass `onUpdate={updateReminder}` into `ReminderItem` alongside the existing `onEdit`/`onFlag`/`onDelete`, and add `onUpdate: (id: string, patch: Partial<Reminder>) => void` to `ReminderItem`'s props type.

- [ ] **Step 2: Add detail-expand state + toggle in `ReminderItem`**

In `ReminderItem`, add `const [showDetail, setShowDetail] = useState(false)`. Make the row title press toggle it: wrap the title in a `Pressable onPress={() => setShowDetail((v) => !v)}`.

- [ ] **Step 3: Render the detail block (below the row, when `showDetail`)**

At the end of the `ReminderItem` card, after the actions row, add:

```tsx
{showDetail && (
  <View style={{ marginTop: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: diffuse ? dt.colors.line : colors.border, paddingTop: 12 }}>
    {/* Notes */}
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: diffuse ? dt.colors.ink3 : colors.textMuted }}>{t('reminders_notesLabel')}</Text>
      <TextInput
        defaultValue={r.notes ?? ''}
        onEndEditing={(e) => onUpdate(r.id, { notes: e.nativeEvent.text })}
        placeholder={t('reminders_notesPlaceholder')}
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textFaint}
        multiline
        style={{ fontFamily: diffuse ? diffuseFont.body : font.body, fontSize: 14, color: diffuse ? dt.colors.ink : colors.text, borderWidth: 1, borderColor: diffuse ? dt.colors.line : colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, minHeight: 40 }}
      />
    </View>

    {/* Checklist */}
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: diffuse ? dt.colors.ink3 : colors.textMuted }}>{t('reminders_checklistLabel')}</Text>
      {(r.checklist ?? []).map((c) => (
        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => onUpdate(r.id, { checklist: (r.checklist ?? []).map((x) => x.id === c.id ? { ...x, done: !x.done } : x) })}
            style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: c.done ? colors.text : (diffuse ? dt.colors.line2 : colors.border), backgroundColor: c.done ? colors.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {c.done ? <Check size={13} color={colors.bg} strokeWidth={3} /> : null}
          </Pressable>
          <Text style={{ flex: 1, fontFamily: diffuse ? diffuseFont.body : font.body, fontSize: 14, color: diffuse ? dt.colors.ink : colors.text, textDecorationLine: c.done ? 'line-through' : 'none', opacity: c.done ? 0.6 : 1 }}>{c.text}</Text>
          <Pressable onPress={() => onUpdate(r.id, { checklist: (r.checklist ?? []).filter((x) => x.id !== c.id) })} hitSlop={8}>
            <X size={13} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
          </Pressable>
        </View>
      ))}
      <ChecklistAdder onAdd={(text) => onUpdate(r.id, { checklist: [...(r.checklist ?? []), { id: Date.now().toString(), text, done: false }] })} placeholder={t('reminders_addChecklistItem')} colors={colors} diffuse={diffuse} dt={dt} />
    </View>
  </View>
)}
```

- [ ] **Step 4: Add the `ChecklistAdder` subcomponent**

At the bottom of the file (module scope), add a small controlled input that clears on submit:

```tsx
function ChecklistAdder({ onAdd, placeholder, colors, diffuse, dt }: {
  onAdd: (text: string) => void; placeholder: string
  colors: ReturnType<typeof useTheme>['colors']; diffuse: boolean; dt: ReturnType<typeof useDiffuseTheme>
}) {
  const [text, setText] = useState('')
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      placeholder={placeholder}
      placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textFaint}
      returnKeyType="done"
      blurOnSubmit={false}
      onSubmitEditing={() => { const v = text.trim(); if (v) onAdd(v); setText('') }}
      style={{ fontFamily: diffuse ? diffuseFont.body : font.body, fontSize: 14, color: diffuse ? dt.colors.ink : colors.text, borderWidth: 1, borderColor: diffuse ? dt.colors.line : colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}
    />
  )
}
```

Confirm `Check` is imported from `lucide-react-native` (it is — used by the checkbox already) and `font`/`diffuseFont` are module imports.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep UserReminders || echo clean`
Expected: `clean`.

- [ ] **Step 6: Commit**

```bash
git add components/home/UserReminders.tsx
git commit -m "feat(reminders): tap-to-detail with notes + checklist editing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Wallet inline preview (pregnancy + cycle)

**Files:**
- Modify: `components/home/pregnancy/WeekWallet.tsx`
- Modify: `components/home/cycle/CycleWallet.tsx`

**Interfaces:**
- Consumes: `loadReminders`, `upcomingReminders` (Task 1); `WalletCard` (accepts `children` as an inline body — verify).
- Produces: the Reminders wallet card shows the next 1–2 upcoming inline; tap still opens the sheet.

- [ ] **Step 1: WeekWallet — load + preview**

In `components/home/pregnancy/WeekWallet.tsx`:
- Import: `import { loadReminders, upcomingReminders, type Reminder } from '../../../lib/reminders'`
- Add state + effect to load the pregnancy reminders (refresh when the sheet closes):
  ```ts
  const [reminders, setReminders] = useState<Reminder[]>([])
  useEffect(() => {
    if (remindersOpen) return // don't refetch while editing
    loadReminders(userId ?? null, 'pregnancy').then(setReminders)
  }, [userId, remindersOpen])
  const upcoming = upcomingReminders(reminders, 2)
  ```
  (Ensure `useEffect` is imported from `react`.)
- On the reminders `WalletCard`, when `upcoming.length > 0`, drop `hideChevron`-only rendering and pass a small inline body as `children`, and render it (WalletCard shows `children` when not `hideChevron` — set `hideChevron={c.id === 'reminders' && upcoming.length > 0 ? false : true}` is wrong; instead render the preview as a subtitle line under the title). SIMPLEST: keep the card arrowless, and render the preview lines by passing them into the card body only for reminders:
  ```tsx
  <WalletCard
    key={c.id}
    tone={c.tone}
    icon={iconFor(c.id)}
    title={c.id === 'reminders' && upcoming.length > 0 ? t('pregnancy_reminders_title') : titleFor(c.id)}
    expanded={c.id === 'reminders' && upcoming.length > 0}
    linkOnly={c.linkOnly}
    last={isLast}
    hideChevron={!(c.id === 'reminders' && upcoming.length > 0)}
    onPressHeader={() => onHeader(c.id, c.linkOnly)}
  >
    {c.id === 'reminders' && upcoming.length > 0 ? (
      <View style={{ gap: 6 }}>
        {upcoming.map((r) => (
          <Text key={r.id} numberOfLines={1} style={{ fontFamily: diffuse ? diffuseFont.body : f.body, fontSize: 13, color: diffuse ? dt.colors.ink2 : colors.textMuted }}>
            {`• ${r.text}${r.dueDate ? ` · ${r.dueDate}` : ''}`}
          </Text>
        ))}
      </View>
    ) : undefined}
  </WalletCard>
  ```
  NOTE: `WalletCard` only renders `children` when `showBody = expanded && !linkOnly && !hideChevron`. So for the preview to show, set `expanded` true + `hideChevron` false for the reminders card (as above). The header press still calls `onHeader` → opens the sheet.

- [ ] **Step 2: Verify WalletCard renders the body under these flags**

Read `components/home/WalletCard.tsx` — confirm `showBody = expanded && !linkOnly && children` and that the earlier `hideChevron` change gates it (`showBody && !hideChevron`). With `expanded=true, linkOnly=false, hideChevron=false`, the body renders and the chevron shows. If a chevron is unwanted on the preview, that's acceptable (it now expands to the preview); the header tap opens the sheet regardless. Keep the chevron for the reminders-with-preview case.

- [ ] **Step 3: CycleWallet — same preview**

Apply the identical change in `components/home/cycle/CycleWallet.tsx`, but load with `context 'pre-pregnancy'` (that's the cycle context this file already uses: `<UserReminders userId={userId} context="pre-pregnancy" />`). Use that same context string in `loadReminders(userId ?? null, 'pre-pregnancy')`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "WeekWallet|CycleWallet" || echo clean`
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add components/home/pregnancy/WeekWallet.tsx components/home/cycle/CycleWallet.tsx
git commit -m "feat(reminders): wallet cards preview next 1-2 upcoming

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Full typecheck + manual QA

**Files:** none (integration)

- [ ] **Step 1: Full suite + typecheck**

Run: `npx jest lib/__tests__/reminders.test.ts && npx tsc --noEmit 2>&1 | grep -v "lib/i18n" | grep -E "error TS" | grep -iE "reminders|UserReminders|WeekWallet|CycleWallet" | head`
Expected: reminders tests pass; no tsc errors in the feature files.

- [ ] **Step 2: Manual QA (pregnancy + cycle)**

Verify: open Reminders sheet → add a reminder with 2 tags + notes + priority; the row shows its tag chips; tap the title → detail expands; add a checklist item + check it → the `1/2` hint shows on the row; add a second reminder with a different tag → filter chips appear, tapping one narrows the list; the wallet Reminders card shows the next 1–2 inline; switch to **cycle** mode → the cycle wallet + sheet behave the same; kill & relaunch → everything persists; a pre-existing reminder (no tags/notes) still renders + is editable.

- [ ] **Step 3: Commit any QA fixes**

```bash
git add -- components/home/UserReminders.tsx components/home/pregnancy/WeekWallet.tsx components/home/cycle/CycleWallet.tsx lib/reminders.ts
git commit -m "fix(reminders): QA adjustments

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** data model (T1) ✓ · shared helpers `upcomingReminders`/`allTags`/load/save (T1) ✓ · back-compat parse (T1 test) ✓ · i18n keys (T2) ✓ · UserReminders on shared types (T3) ✓ · composer tags/notes/priority (T4) ✓ · filter chips + per-row tag/checklist labels (T5) ✓ · tap-to-detail notes+checklist (T6) ✓ · wallet next-1–2 preview pregnancy+cycle (T7) ✓ · neutral tag chips (T4/T5 use colors.text/border, not mode color) ✓ · manual QA incl. cycle + persistence + back-compat (T8) ✓.

**Placeholder scan:** no TBD/TODO. T7 Step 1 contains a deliberate "this is wrong; do X instead" teaching note about `hideChevron` — it resolves to concrete code (expanded=true + hideChevron=false for the preview case); acceptable as it shows the exact final code.

**Type consistency:** `Reminder`/`ChecklistItem` defined in T1 and imported everywhere after. `upcomingReminders(list, n)`, `allTags(list)`, `loadReminders(userId, context)`, `saveReminders(userId, context, list)`, `storageKey(userId, context)` signatures identical T1↔T3/T7. `updateReminder(id, patch: Partial<Reminder>)` consistent T6. `ChecklistAdder` props match its call site (T6). i18n `reminders_checklistCount` uses `{{done}}/{{total}}` params, matched by the `t('reminders_checklistCount', { done, total })` calls (T5/T6).
