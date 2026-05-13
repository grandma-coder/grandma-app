# grandma.app — Design System

**Canonical source of truth.** Two files implement this system:

1. **`constants/theme.ts`** — runtime tokens, the `useTheme()` hook, helpers
2. **`docs/Claude design studio, new design system log and screens/grandma-studio.html`** — canonical visual showcase

Both are kept in sync. If they disagree, **`theme.ts` wins** (it's what ships).

> **Design language (Apr 2026 redesign)** — cream-paper / sticker-collage. Light is the default canvas; dark uses warm ink on parchment. Same sticker palette in both. Editorial serif display (Fraunces) + sans body (DM Sans) + italic accent (Instrument Serif).

This document is **enforcement-grade**: it tells you exactly which component to reach for, what props it takes, what dimensions to use, and what to avoid. If you can't find an answer here, **ask** — don't invent values.

---

## 0. The single rule

**Never hardcode a color, radius, font, or shadow.** Always import from `constants/theme.ts` via `useTheme()` or named exports (`brand`, `stickers`, `radius`, `spacing`, `font`).

**The only exception** is inside SVG path strings for sticker/illustration files. These *are* the design assets — their fills are part of the palette definition, not a consumer of it:
- `components/ui/Stickers.tsx`
- `components/stickers/BrandStickers.tsx`
- `components/stickers/RewardStickers.tsx`
- `components/home/pregnancy/babyIllustrations.tsx`
- `components/home/pregnancy/stickerIcons.tsx`
- `components/home/pregnancy/affirmationTemplates.tsx`
- `components/calendar/tints.ts` (a curated tint palette by design)

Every other file — every screen, every component, every layout — must use tokens.

---

## 1. Tokens

### 1.1 Hooks

```ts
import { useTheme } from '@/constants/theme'

const { colors, brand, stickers, radius, spacing, fontSize, fontWeight, font, isDark } = useTheme()
```

- `useTheme()` is the **only** hook to use in components. It returns the resolved light/dark token set automatically.
- **Do not** import `lightTokens` or `darkTokens` directly — always go through `useTheme()`.
- For `CosmicBackground` only, an internal `useAppTheme()` exists in `components/ui/ThemeProvider.tsx` — it provides gradients. Do not use elsewhere.

### 1.2 Color — brand & mode (mode-independent constants)

```ts
import { brand } from '@/constants/theme'

brand.primary        // #7048B8  purple — primary brand
brand.primaryLight   // #9B70D4
brand.primaryDark    // #4A2880
brand.primaryTint    // #EFE6FF

brand.secondary      // #3B7DD8  blue — secondary actions
brand.secondaryTint  // #E3EDFF

brand.accent         // #F59E0B  amber — highlights only, NOT primary CTA
brand.success        // #4CAF50
brand.warning        // #FF9800
brand.error          // #F44336

// Journey modes — soft pastel set (light mode authoritative)
brand.prePregnancy   // #E58BB4  rose
brand.pregnancy      // #B7A6E8  lavender
brand.kids           // #8BB8E8  powder blue

brand.prePregnancySoft  // #F7CFDD
brand.pregnancySoft     // #E0D5F3
brand.kidsSoft          // #D4E3F3

// Cycle phases
brand.phase.menstrual    // #E8557A
brand.phase.follicular   // #D4A017
brand.phase.ovulation    // #3DAA6E
brand.phase.luteal       // #7048B8

// Trimesters
brand.trimester.first    // #F9D77E
brand.trimester.second   // #81C995
brand.trimester.third    // #FFAB76
```

**Mode color in dark mode is auto-brightened** via helpers — never branch on `isDark` yourself:

```ts
import { getModeColor, getModeColorSoft } from '@/constants/theme'
import { useModeStore } from '@/store/useModeStore'

const mode = useModeStore((s) => s.mode)
const { isDark } = useTheme()

const modeColor     = getModeColor(mode, isDark)      // light #B7A6E8 → dark #C4B5EF (preg)
const modeColorSoft = getModeColorSoft(mode, isDark)  // light #E0D5F3 → dark #2D2842 (preg)
```

### 1.3 Color — sticker palette

Stickers are always available regardless of mode. Each has a `Soft` companion for tinted backgrounds.

```ts
const { stickers } = useTheme()  // auto-switches light/dark variant

stickers.yellow   #F5D652   yellowSoft   #FBEA9E   yellowInk   #7C5E0F
stickers.blue     #9DC3E8   blueSoft     #CFE0F0   blueInk     #1F4A7A
stickers.pink     #F2B2C7   pinkSoft     #F9D8E2   pinkInk     #8E3A56
stickers.green    #BDD48C   greenSoft    #DDE7BB   greenInk    #3F5919
stickers.lilac    #C8B6E8   lilacSoft    #E3D8F2   lilacInk    #3A2A6E
stickers.peach    #F5B896   peachSoft    #F9D6C0   peachInk    #8B4A26
stickers.coral    #EE7B6D                          coralInk    #B43E2E
stickers.charcoal #2A2624                          // near-black ink
```

**Three variants per hue, used by intent:**
- `<hue>`     — fill / sticker body
- `<hue>Soft` — tinted background (cards, chips at rest)
- `<hue>Ink`  — small icon stroke or chip text on cream paper (darker, more weight)

In dark mode `*Ink` returns the regular sticker hue (icons need to brighten, not darken).

### 1.4 Color — semantic (resolved per theme)

`useTheme().colors` returns this object. All values flip light ↔ dark automatically.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F3ECD9` cream | `#1A1713` | Page background |
| `bgWarm` | `#EFE5CC` | `#13110E` | Deeper section background |
| `surface` | `#FFFEF8` paper-white | `#232019` | Card backgrounds |
| `surfaceRaised` | `#F7F0DF` | `#2C2820` | Nested/elevated cards |
| `surfaceGlass` | `rgba(20,19,19,0.04)` | `rgba(245,237,220,0.06)` | Faint tint (rare) |
| `border` | `rgba(20,19,19,0.08)` | `rgba(245,237,220,0.18)` | Hairline divider |
| `borderLight` | `rgba(20,19,19,0.05)` | `rgba(245,237,220,0.10)` | Softer hairline |
| `borderStrong` | `rgba(20,19,19,0.14)` | `rgba(245,237,220,0.30)` | Emphasised hairline |
| `text` | `#141313` | `#F5EDDC` | Primary ink |
| `textSecondary` | `#3A3533` | `#D6CCB5` | Subdued ink |
| `textMuted` | `#6E6763` | `#9E9684` | De-emphasised |
| `textFaint` | `#A69E93` | `#6E6757` | Placeholder / decorative |
| `textInverse` | `#F5EDDC` | `#141313` | On dark/ink surfaces |
| `primary` | `#7048B8` | `#C4B5EF` lavender | Primary action |
| `tabBg` | `rgba(20,19,19,0.96)` | `rgba(26,23,19,0.96)` | Tab bar background |
| `tabActive` | `brand.pregnancy` | `#C4B5EF` | Active tab |
| `tabInactive` | `rgba(245,237,220,0.55)` | `rgba(245,237,220,0.45)` | Inactive tab |

**Light vs dark explicit constants.** Many existing components hardcode `'#141313'` / `'#FFFEF8'` / `'#F3ECD9'` inside `if (isDark)` branches. **Don't do that in new code.** Use `colors.text`, `colors.surface`, `colors.bg` — they resolve correctly in both themes.

### 1.5 Radius

```ts
import { radius } from '@/constants/theme'

radius.sm    // 12   small chips, mini stickers
radius.md    // 20   inputs, default cards (PaperCard default)
radius.lg    // 28   medium-emphasis cards, hero sections
radius.xl    // 36   large sheets, modal cards (PaperAlert)
radius.xxl   // 48   hero displays
radius.full  // 999  pills, buttons, sticker sockets
```

**Default card radius is `radius.md` (20).** Use `radius.lg` (28) for hero/feature cards, `radius.xl` (36) for modals.

**Sticker sockets:** in this codebase the convention is **half-of-width** (`borderRadius: width / 2`), not `999`. Both render the same for a square — but match the local pattern (see FormRow: `width: 40, height: 40, borderRadius: 20`).

### 1.6 Spacing

```ts
import { spacing } from '@/constants/theme'

spacing.xs    // 4
spacing.sm    // 8
spacing.md    // 16
spacing.lg    // 24
spacing.xl    // 32
spacing.xxl   // 48
```

Convention:
- Screen horizontal padding: `spacing.lg` (24)
- Card internal padding: 16–22 (default `PaperCard` uses 16)
- Card-to-card gap in a list: 12
- Inline element gap inside a row: `spacing.sm` to 12

### 1.7 Typography

**Use the typography primitives in `components/ui/Typography.tsx` instead of styling raw `<Text>`** whenever possible:

```tsx
import { Display, DisplayItalic, MonoCaps, Body } from '@/components/ui/Typography'

<Display size={40}>Hello</Display>                // Fraunces 600, tight tracking, -0.8 letter-spacing
<DisplayItalic size={32}>brave new world</DisplayItalic>  // Instrument Serif italic, -0.4
<MonoCaps>RECENT ACTIVITY</MonoCaps>              // DM Sans 500 uppercase, 1.2 letter-spacing
<Body size={15}>Long-form copy.</Body>            // DM Sans 400
```

When styling `<Text>` directly:

```ts
const { font, fontSize, colors } = useTheme()

fontFamily: font.display        // Fraunces_600SemiBold       headings + numbers
fontFamily: font.italic         // InstrumentSerif_400_Italic accent
fontFamily: font.body           // DMSans_400Regular           body
fontFamily: font.bodyMedium     // DMSans_500Medium            UI medium
fontFamily: font.bodySemiBold   // DMSans_600SemiBold          UI labels, button labels
```

| `fontSize` | px | Used for |
|---|---|---|
| `xs` | 11 | (rare, prefer 10 for MonoCaps) |
| `sm` | 14 | Small body |
| `md` | 16 | Default body, button labels |
| `lg` | 18 | Subtitles |
| `xl` | 22 | Card titles |
| `xxl` | 28 | Section headers |
| `display` | 36 | Hero numbers (e.g. StepSlider value) |
| `hero` | 48 | Onboarding hero |

**Letter-spacing rules** (canonical values from `Typography.tsx`):
- `Display` — `-0.8`
- `DisplayItalic` — `-0.4`
- `MonoCaps` / uppercase 10–11px labels — **`1.2`** (not 2 or 3)
- Button labels (16px semibold) — `-0.2`
- Mode/uppercase chips (12–14px) — `1.5` to `2`

### 1.8 Shadows

The sticker-on-paper aesthetic uses **two distinct shadow modes**:

**(a) Soft drop shadow** — used by `PaperCard` and modals. Faint, blurred, off-black. `PaperCard`'s built-in shadow:

```ts
shadowColor: '#141313',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.08,
shadowRadius: 12,
elevation: 2,
```

(The tokenized `shadows.card` is even softer — `opacity 0.04, radius 0`. Use the token when applying shadow yourself; `PaperCard` already handles its own.)

**(b) Hard offset shadow** ("sticker-on-paper") — used by `PillButton`, `StickerButton`, slider thumb. Solid color, zero blur, depresses on press:

```ts
shadowColor: <borderColor>,
shadowOffset: { width: 0, height: pressed ? 1 : 3 },
shadowOpacity: 1,
shadowRadius: 0,    // hard edge
elevation: 4,
// also: transform: [{ translateY: pressed ? 2 : 0 }]
```

**Tokenized shadows in `theme.ts`:**

```ts
shadows.card     // default card shadow (soft)
shadows.cardPop  // emphasised — modals, hero
shadows.pop      // strongest soft shadow — high emphasis
shadows.subtle   // 4 / 8 — light interactive
```

> **Forbidden.** `shadows.glow`, `shadows.glowPink`, `shadows.glowBlue` — these are dead neon-system shadows. Do not use in new code.

---

## 2. Components

### 2.1 Button decision tree

**There are three button components. Pick by visual intent, not by name.**

| You want… | Use | Why |
|---|---|---|
| Primary action on a screen (save, continue, next) | `PillButton` `variant="ink"` | Ink-on-paper, the new system canonical CTA. **58px** default. |
| Secondary / cancel on a screen | `PillButton` `variant="paper"` | Paper bg, ink border. Pairs with `ink` primary. |
| CTA inside a mode-tinted card | `PillButton` `variant="accent"` + `accentColor={modeColor}` | Uses mode color as fill. |
| A colored "sticker" CTA — playful, in-context tap (mode tile, log type) | `StickerButton` color={stickers.yellow} | **52px** default. Pair active/inactive states via `active` prop. |
| Destructive action (delete, sign out) | `StickerButton` color={stickers.coral} colorSoft={stickers.peachSoft} (`tone` route) — or `PaperAlert` `variant="danger"` button | Coral = the destructive color. |
| Inline text link / minor action | A raw `<Pressable>` wrapping `<Body color={colors.primary}>` | No component for this; tap targets stay ≥ 44 high via `hitSlop`. |
| Icon-only header back | `ScreenHeader` (handles this) | Never roll your own. |
| Icon-only inline (small action) | `<Pressable hitSlop={12}>` with a 38×38 or 44×44 paper-pill child. | Match `ScreenHeader.backBtn` style (38×38, `borderRadius: 999`, hairline border). |

> `GradientButton` (legacy neon-yellow pill with `shadows.glow`) was deleted. If you find a reference somewhere, replace it with `PillButton variant="ink"`.

#### 2.1.1 `PillButton`

```tsx
<PillButton
  label="Save changes"
  onPress={save}
  variant="ink"           // "ink" (default) | "paper" | "accent"
  disabled={false}
  loading={false}
  leading={<Icon />}      // optional left slot
  trailing={<Icon />}     // optional right slot
  accentColor={modeColor} // only for variant="accent"
  height={58}             // default 58; pass 72 for hero/form CTAs
/>
```

- **Radius:** 999 (built in)
- **Border:** 1.5px, color matches ink in light, `colors.border` in dark
- **Shadow:** hard offset, presses on tap (`translateY: 2`)
- **Disabled opacity:** `0.55` (built in — don't override)
- **Loading state:** label becomes `'…'` (not a spinner)
- **Typography:** `font.bodySemiBold`, 16px, `-0.2` tracking
- **Use `variant="paper"` for "Cancel" — never an outline-only button.**

#### 2.1.2 `StickerButton`

```tsx
<StickerButton
  label="Log feeding"
  color={stickers.yellow}          // required: main fill
  colorSoft={stickers.yellowSoft}  // optional: inactive bg
  colorDark={stickers.yellow}      // optional: shadow/border darker shade
  icon={<Drop fill="#141313" />}
  active={true}                    // true = filled; false = soft tint
  disabled={false}
  height={52}                      // default 52
  fontSize={15}
  textColor={undefined}            // defaults to ink #141313 — pass white only for dark fills
/>
```

- **Radius:** 999 (built in)
- **Border:** 2px solid in `colorDark` (or `color`)
- **Disabled opacity:** `0.45`
- **Active vs inactive:** active shows shadow; inactive has no shadow, soft fill, color border

#### 2.1.3 Pressed / disabled visual contract

All buttons in this system:
- **Pressed:** `translateY(2)` and `shadowOffset.y` drops from 3 → 1 (the "stamp" effect). Built into `PillButton` and `StickerButton`.
- **Disabled:** opacity 0.45 (`StickerButton`) or 0.55 (`PillButton`). **Do not** also gray out colors — the opacity is enough.
- **Loading:** for `PillButton`, label becomes ellipsis. If you need a spinner, render `<ActivityIndicator color={colors.text} />` inside a custom button.

### 2.2 Cards — `PaperCard`

**Default card. Use this whenever you'd reach for a `<View>` with a background.**

```tsx
<PaperCard
  tint={undefined}           // optional bg override (e.g. mode-soft)
  flat={false}               // true = no shadow
  radius={20}                // default 20 (radius.md); pass 28 for hero
  padding={16}               // default 16
  borderColor={undefined}    // optional override
>
  {/* content */}
</PaperCard>
```

**Variants by intent:**

| Intent | Props |
|---|---|
| Standard card | `<PaperCard>…</PaperCard>` |
| Mode-tinted (home hero, week card) | `<PaperCard tint={getModeColorSoft(mode, isDark)}>` |
| Sticker-accent card (quest, reward) | `<PaperCard tint={stickers.yellowSoft}>` |
| Inline strip, no elevation | `<PaperCard flat>` |
| Sheet content card | `<PaperCard radius={28} padding={22}>` |

**Forbidden in new code:**
- `GlassCard` was deleted — `PaperCard` replaces it everywhere
- Inline `<View style={{ backgroundColor: colors.surface, borderRadius: …, padding: … }}>` — wrap in `PaperCard` so the shadow + border are consistent.

### 2.3 Inputs

**`FormRow`** — the canonical input/row component for forms (profile, onboarding, settings). Uppercase label above a serif value, optional sticker icon left, optional trailing slot.

```tsx
<FormRow
  label="DUE DATE"
  value="May 11 2026"
  sticker={<Heart fill={stickers.pink} size={18} />}
  stickerTint={stickers.pinkSoft}      // optional bg of sticker circle
  onPress={openPicker}                 // makes it pressable + shows chevron
  showChevron={true}
>
  {/* optional custom trailing control */}
</FormRow>
```

- **Radius:** 20 (`radius.md`)
- **Padding:** 12 / 12
- **Sticker socket:** 40×40, `borderRadius: 20`
- **Label:** `MonoCaps`-style — 10px, `bodyMedium`, uppercase, 1.2 tracking, color `textFaint`
- **Value:** `font.display`, 16px, ink

**Free-text inputs — `TextField`** (canonical wrapped TextInput):

```tsx
import { TextField } from '@/components/ui/TextField'

<TextField
  label="EMAIL"                       // optional uppercase label
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  error={errors.email}                // renders FieldError below
  height={64}                         // default 64; pass 72 for big inputs
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

- **Radius:** 20 (`radius.md`)
- **Border:** 1px `colors.border`, jumps to 1.5px `brand.error` on error
- **Label:** uppercase 10px, `font.bodyMedium`, 1.2 tracking, `colors.textFaint`, 8px marginBottom
- **Selection color:** `brand.secondary`
- **Forwards ref** to the underlying `TextInput` (use for focus chaining)

If you absolutely can't use `TextField` (e.g. needs custom layout around the input), spread `inputStyles` from `theme.ts`:

```ts
import { inputStyles } from '@/constants/theme'
<TextInput style={inputStyles.field} placeholderTextColor={inputStyles.placeholderTextColor} … />
```

**Validation error — `FieldError`** (auto-rendered by `TextField`):

```tsx
import { FieldError } from '@/components/ui/FieldError'

<FieldError message="Please enter a valid email" />
```

- 13px, `font.bodyMedium`, `brand.error`
- 8px top margin
- Inline alert-circle icon (Ionicons, 14px); hide via `showIcon={false}`

### 2.4 Slider — `StepSlider`

Snap-to-integer slider with a sticker thumb (paper circle, hard-offset shadow, tilts on drag).

```tsx
<StepSlider
  min={1}
  max={12}
  value={hours}
  onChange={setHours}
  color={getModeColor(mode, isDark)}  // track fill + thumb border
  unit="hrs"                          // optional value suffix
/>
```

- **Track:** 10px tall, `colors.surface` bg, `colors.border` border
- **Thumb:** 36×36, paper-white fill, 2.5px border in `color`, resting tilt `-3°`, dragging tilt `+6°`, scale 1 → 1.18, easing `out(cubic) 140ms`
- **Min/max tap targets:** the labels are pressable, jump to min/max

### 2.5 Toast — `useSavedToast()`

Replaces `Alert.alert('Saved', …)` everywhere. Branded popup: animated GrandmaLogo, three sticker accents, serif title, body, optional OK button. Auto-dismiss default 2400ms.

**Wiring (once, in `_layout.tsx`):**
```tsx
import { SavedToastProvider } from '@/components/ui/SavedToast'

<SavedToastProvider>
  <Stack />
</SavedToastProvider>
```

**Usage (anywhere):**
```tsx
import { useSavedToast } from '@/components/ui/SavedToast'

const toast = useSavedToast()

toast.show({
  title: 'Saved',                                    // default "Saved"
  message: 'Your profile has been updated.',         // default "Your changes have been saved."
  autoDismiss: 2400,                                 // ms; 0 = require manual OK
  showButton: false,                                 // defaults to true when autoDismiss === 0
  accent: undefined,                                 // override logo heart color
})
```

- **Entry animation:** scale `0.88 → 1` (spring friction 7, tension 80) + opacity `0 → 1` (220ms `out(quad)`). Don't roll your own — use the toast.
- **When to use:** any success confirmation after a write (save, submit, log). Don't use for errors — use `PaperAlert` for those.

### 2.6 Alert / confirm — `PaperAlert`

For destructive confirms, blocking errors, important info. Modal-style.

```tsx
<PaperAlert
  visible={open}
  title="Delete this entry?"
  italic="forever"               // optional italic accent line (coral)
  message="This can't be undone."
  buttons={[
    { label: 'Cancel', variant: 'secondary', onPress: () => setOpen(false) },
    { label: 'Delete', variant: 'danger',    onPress: handleDelete },
  ]}
  onRequestClose={() => setOpen(false)}
/>
```

- **Card:** `radius.xl` (36), `colors.surface`, 1px border, soft drop shadow
- **Backdrop:** `#141313` at 40% opacity, tap-to-dismiss
- **Animation:** fade 180ms + spring scale `0.92 → 1` (friction 7, tension 90)
- **Button variants:**
  - `primary` → `brand.pregnancy` fill, ink text (most positive action)
  - `secondary` → transparent, ink border, ink text (cancel)
  - `danger` → `stickers.peachSoft` fill, `stickers.coral` text (destructive)
- **Layout:** buttons stack vertically, 52px tall each, 10px gap

### 2.7 Modals & sheets

There is **no generic bottom sheet** primitive. Use a `react-native` `<Modal>` with:

- `animationType="slide"` (bottom-sheet) or `"fade"` (centered)
- `transparent`
- `statusBarTranslucent`
- A dimmed backdrop `<Pressable>` with `backgroundColor: 'rgba(0,0,0,0.55)'` (toast) or `'#141313' @ 0.4` (alert)
- Content wrapped in `<PaperCard radius={36} padding={22}>`
- Bottom safe-area padding: `useSafeAreaInsets().bottom` for any sticky/bottom-pinned content

For date selection, use `components/ui/StickerDateModal.tsx` (sticker-styled date picker).

### 2.8 Screen scaffold

Every full-page screen wraps like this:

```tsx
import { CosmicBackground } from '@/components/ui/CosmicBackground'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { useTheme, spacing } from '@/constants/theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function MyScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Title" />
        {/* sections, cards, forms */}
      </ScrollView>
    </CosmicBackground>
  )
}
```

- **`ScreenHeader`** props: `title?`, `onBack?`, `hideBack?`, `right?` (ReactNode).
- **Back button** in `ScreenHeader` is a 38×38 paper pill, `borderRadius: 999`, hairline border. Auto-uses `router.back()`.
- **Tab-screen bottom padding** — when the screen renders inside `(tabs)`, the tab bar is 84px tall (with 34px safe-area pad). Add `paddingBottom: 100 + insets.bottom` to your last scroll content.
- **Sticky bottom button** (e.g. save bar over content): absolute-position a `<View>` with `bottom: 0`, `padding: spacing.lg`, `paddingBottom: insets.bottom + spacing.lg`, `backgroundColor: colors.bg`, top hairline border. ScrollView gets `paddingBottom: 120 + insets.bottom`.

### 2.9 Forms — keyboard & focus

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native'

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <ScrollView keyboardShouldPersistTaps="handled">
    {/* TextInputs */}
  </ScrollView>
</KeyboardAvoidingView>
```

- Always wrap forms in `KeyboardAvoidingView` with `behavior` branched on platform.
- `returnKeyType="next"` on non-final fields, `"done"` on the last.
- Use `onSubmitEditing` + `ref.focus()` to advance focus.

### 2.10 Tab bar

```ts
height: 84,                       // includes 34px iOS safe-area
backgroundColor: colors.tabBg,    // dark ink in light mode (intentional contrast)
borderTopWidth: 0,
// active icon/label:   colors.tabActive (mode-driven)
// inactive:            colors.tabInactive
// label:               10px, font.bodySemiBold, uppercase, letterSpacing 3
```

Tab bar styling lives in `app/(tabs)/_layout.tsx`. Don't touch unless adding a tab.

### 2.11 Sticker components & SVGs

All stickers are SVG React components:
- `components/ui/Stickers.tsx` — geometric set (Burst, Blob, Heart, Star, Sparkle, Moon, Drop, Flower, Cross, Pill, Leaf, Dna)
- `components/stickers/BrandStickers.tsx` — branded set
- `components/stickers/RewardStickers.tsx` — achievement stickers
- `components/stickers/BadgeIcon.tsx`, `LineIcons.tsx` — icons

**Rules:**
- Always pass a `fill` prop from `stickers.*` or `brand.*` — never inline hex
- Icon socket: 40×40 with `borderRadius: 20`, background `stickers.<color>Soft` or `colors.bgWarm`
- Floating accent rotation: `-18°` to `+16°` (see SavedToast)
- Drop shadow filter for stamped feel: `0 2px 0 rgba(20,19,19,0.06), 0 6px 10px rgba(20,19,19,0.08)`

### 2.12 Icon button standards

| Size | Container | Use |
|---|---|---|
| Small (32×32) | `borderRadius: 16`, hairline border | Inside compact lists, secondary actions |
| **Medium (38×38)** | `borderRadius: 999`, paper, hairline border | **Default** — matches `ScreenHeader` back button |
| Large (44×44) | `borderRadius: 22`, sticker-soft fill | Tappable hero affordances |

Always: `hitSlop: 12` on the `Pressable`. Icon size = ~half the container (Ionicons 18–20 in a 38px button).

### 2.13 Animation conventions

All component animations in this system use **Animated** (not Reanimated) unless explicitly noted. Canonical motion presets:

| Motion | Config |
|---|---|
| Modal/card entry — scale | `spring(0.88 → 1, friction: 7, tension: 80)` |
| Modal/card entry — opacity | `timing(0 → 1, 220ms, Easing.out(Easing.quad))` |
| Alert entry | `spring(0.92 → 1, friction: 7, tension: 90)` + 180ms fade |
| Drag lift (slider thumb) | `timing(0 → 1, 140ms, Easing.out(Easing.cubic))` |
| Press depress | `translateY: 0 → 2` (synchronous via Pressable's `pressed`) |

For complex layout/gesture work (carousels, gesture-driven rings) Reanimated v4 **is** available — but copy the timing constants above so app motion feels coherent.

**Always set `useNativeDriver: true`** on `Animated` calls unless animating a non-transform / non-opacity property.

### 2.14 Haptics

```ts
import * as Haptics from 'expo-haptics'

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)   // tap, toggle on
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)  // selection committed, log saved
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)  // toast trigger
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)  // destructive confirm
```

Fire haptics on: save success, destructive confirm, slider snap to min/max, sticker stamp animations completing.

### 2.15 Empty states — `EmptyState`

```tsx
import { EmptyState } from '@/components/ui/EmptyState'
import { Heart } from '@/components/ui/Stickers'

<EmptyState
  icon={<Heart fill={stickers.lilac} size={36} />}
  iconBg={stickers.lilacSoft}        // optional; defaults to colors.surfaceRaised
  title="No logs yet"
  message="Your saved entries will appear here."
  ctaLabel="Add the first one"        // optional — renders PillButton variant="ink"
  onCtaPress={() => router.push('/scan')}
/>
```

- Icon socket: 80×80, `borderRadius: 40` (half-of-width)
- Layout: vertical, centered, 24px vertical padding, 16px gap
- Title: `Display` 20px
- Message: `Body` 14px `colors.textMuted`, max-width 280

### 2.15a Loading skeleton — `Skeleton`

```tsx
import { Skeleton } from '@/components/ui/Skeleton'

<Skeleton width="100%" height={120} radius={radius.md} />
<Skeleton width={180} height={16} />              // text line
<Skeleton width={44} height={44} radius={22} />   // sticker socket
```

- Animated opacity pulse `0.4 ↔ 1` (800ms each way), `useNativeDriver: true`
- Background: `colors.surfaceRaised`
- Always pass the **same radius** the real content will have, so layout doesn't jump on swap

### 2.15b Pull-to-refresh

```tsx
<RefreshControl tintColor={colors.primary} colors={[colors.primary]} />
```

iOS uses `tintColor`, Android uses the `colors` array.

### 2.16 Charts

All charts live in `components/charts/`. They're custom SVG — no external chart library.

**Series palette.** When a chart needs multiple data series, use `chartSeries` from `theme.ts` **in order**:

```ts
import { chartSeries } from '@/constants/theme'

// chartSeries[0] = stickers.lilac    (primary — matches pregnancy brand)
// chartSeries[1] = stickers.peach
// chartSeries[2] = stickers.green
// chartSeries[3] = stickers.blue
// chartSeries[4] = stickers.yellow
// chartSeries[5] = stickers.coral    (also destructive — use last)
```

For a single-series chart, default to the active mode color: `color={getModeColor(mode, isDark)}`.

**Existing chart primitives** in `components/charts/SvgCharts.tsx`:

| Component | Props | Use for |
|---|---|---|
| `LineChart` | `data: number[]`, `labels?`, `color?`, `width=300`, `height=200`, `showAverage?`, `unit?`, `onPress?` | Trend over time — weight, kicks, sleep duration |
| `BarChart` | `data: number[]`, `labels?`, `color?`, `width=300`, `height=200`, `showValues=true`, `onPress?` | Counts per day/week — water, feedings |
| `HeatmapGrid` | `data`, `rowLabels`, `colLabels`, `color`, `onPress?` | Period/symptom tracking grids |
| `BubbleGrid` | `items`, `onPress?` | Categorical clusters |
| `DotTimeline` | `dots`, `cycleLength=28`, `color`, `width=300`, `onPress?` | Cycle position dots |
| `MoodStickerStrip` | `days: MoodStripDay[]` (`label`, `dominantMood`, `intensityRatio`) | Weekly mood per-day strip with sticker glyphs |
| `MoodBubbleCluster` | `items: MoodBubbleItem[]` (`mood`, `count`) | Aggregate mood distribution as size-sorted bubbles (80–140px) |

In `components/charts/GalleryCharts.tsx` (specialty visualizations — read source before adopting): `HormoneWave`, `LiquidFillBottle`, `CycleTodayPulse`, `WeeksProgressBeads`, `PulseBubblesLive`, `PolarClock24h`, `MoodStripLollipop`, `BlockTower`, `RadarWellness`, `Candlesticks`.

**Wrapper:** `FullScreenChart({ visible, title, onClose, children })` — full-screen modal scaffold for any chart that needs a dedicated "tap to expand" view.

**Anti-patterns:**
- Don't import a third-party chart library — extend `SvgCharts.tsx` instead
- Don't hardcode series colors (`#FBBF24`, `#FF7070`) — use `chartSeries[i]`
- Don't pass raw hex to `color` — pass `stickers.*` / `brand.*` / `getModeColor()`

### 2.17 Accessibility

- All `Pressable` with no visible label → `accessibilityLabel="…"`
- Decorative SVGs / stickers → `accessibilityElementsHidden` + `importantForAccessibility="no"`
- Icon-only buttons → `accessibilityRole="button"`, `accessibilityLabel`
- Hit slop ≥ 8 on every tappable that's < 44px tall

---

## 3. Section taxonomy

When naming new screens, analytics groups, or doc sections, mirror the studio HTML's structure:

1. **Auth & onboarding**
2. **Home — three modes** (cycle / pregnancy / kids)
3. **Agenda & calendar**
4. **Analytics**
5. **Insights**
6. **Profile**
7. **Daily rewards**
8. **Reward stickers**
9. **Grandma Talk**

---

## 4. Mode-aware UI

```tsx
import { useModeStore } from '@/store/useModeStore'
import { useTheme, getModeColor, getModeColorSoft } from '@/constants/theme'

const mode = useModeStore((s) => s.mode)        // 'pre' | 'preg' | 'kids'
const { isDark } = useTheme()
const modeColor     = getModeColor(mode, isDark)
const modeColorSoft = getModeColorSoft(mode, isDark)
```

Branch *inside* one component on `mode` — don't create per-mode siblings unless the layout differs substantially (e.g. `PregnancyHome` vs `KidsHome` is legitimate; per-mode buttons are not).

---

## 5. Pre-write checklist

**Before writing or editing any UI code, walk this list. If you can't tick all boxes, stop and re-read.**

### Tokens
- [ ] Imported `useTheme()` and/or `brand` / `stickers` / `radius` / `spacing` / `font`
- [ ] **Zero raw hex** in non-sticker files (the only exception is the SVG asset files listed in §0)
- [ ] No `lightTokens` / `darkTokens` imported directly — went through `useTheme()`
- [ ] Mode color via `getModeColor(mode, isDark)` — never hardcoded per mode

### Shape
- [ ] Cards: `PaperCard` (default `radius.md` 20; pass 28 for hero, 36 for modal)
- [ ] Buttons: `PillButton` (58 / 72), `StickerButton` (52), or `ScreenHeader` back
- [ ] Inputs: `TextField` for free-text; `FormRow` for row-style. `radius.md` (20)
- [ ] Validation errors: `FieldError` (auto-rendered by `TextField`)
- [ ] Empty list / "no content yet": `EmptyState`
- [ ] Loading placeholders: `Skeleton` (not a custom pulse)
- [ ] Multi-series chart: `chartSeries[i]` in order — no raw hex
- [ ] Sticker socket: half-of-width (`width: 40, height: 40, borderRadius: 20`)
- [ ] Pills/buttons: `radius.full` (999) baked in by the component — don't override

### Visual
- [ ] Shadows: only `shadows.card` / `cardPop` / `pop` / `subtle` (soft) or built-in hard-offset (buttons). **No** `shadows.glow*`
- [ ] Disabled opacity: 0.45 (StickerButton) or 0.55 (PillButton) — built in, don't override
- [ ] Pressed: built-in `translateY(2)` — don't roll your own press animation
- [ ] Fonts via `font.*` constants — no raw `'Fraunces…'` / `'DMSans…'` strings

### Behavior
- [ ] Both light + dark verified (text contrast, sticker readability, border visibility)
- [ ] `<KeyboardAvoidingView>` on forms; `keyboardShouldPersistTaps="handled"` on the ScrollView
- [ ] Safe-area: `useSafeAreaInsets()` for top + bottom; tab-screen bottom pad ≥ 100
- [ ] Success after save → `useSavedToast()`. Confirm destructive → `PaperAlert` `danger`. Error → `PaperAlert`
- [ ] Haptics fired on: save, destructive confirm, slider min/max
- [ ] `hitSlop` on any tappable < 44px
- [ ] `accessibilityLabel` on icon-only buttons

### If adding a new reusable UI primitive (`components/ui/`)
- [ ] Accepts `style` prop for overrides
- [ ] Named export (not default)
- [ ] Documented in §2 of this file with prop signature
- [ ] Used `useTheme()` — does not branch on `isDark` for color values that exist in `colors.*`

---

## 6. Anti-patterns

| ❌ Don't | ✅ Do |
|---|---|
| `backgroundColor: '#7048B8'` | `backgroundColor: brand.primary` |
| `backgroundColor: '#FFFEF8'` | `backgroundColor: colors.surface` |
| `color: isDark ? '#F5EDDC' : '#141313'` | `color: colors.text` |
| `borderRadius: 32` | `borderRadius: radius.lg` (or `radius.md`/`xl`) |
| `fontFamily: 'Fraunces_600SemiBold'` | `fontFamily: font.display` |
| `<GradientButton title="Save">` | `<PillButton label="Save" variant="ink">` |
| `<GlassCard>` | `<PaperCard>` |
| Outline-only button | `PillButton variant="paper"` |
| `Alert.alert('Saved', '...')` | `useSavedToast()` |
| `Alert.alert('Delete?', '...', […])` | `<PaperAlert variant="danger">` |
| `shadowColor: brand.primary` (glow) | `shadows.card` or hard-offset (see §1.8) |
| `lightTokens.bg` directly | `useTheme().colors.bg` |
| Hardcoded `#B7A6E8` for active mode | `getModeColor(mode, isDark)` |
| Raw `Pressable` with custom styling for a primary action | `PillButton` |
| `borderRadius: 999` on a square sticker socket | `borderRadius: width / 2` (matches local convention) |
| New `TextInput` with custom border / radius | Spread `inputStyles` from `theme.ts` |
| Custom modal scaffolding | `PaperAlert`, `StickerDateModal`, or `useSavedToast` |
| Auto-dismiss via `setTimeout(close, …)` for toasts | `useSavedToast({ autoDismiss: 2400 })` |
| Raw `<TextInput>` with custom styles | `<TextField>` |
| Inline empty-state `<View>` + `<Text>` | `<EmptyState>` |
| Hand-rolled loading spinner/pulse | `<Skeleton>` |
| Hardcoded series colors `#FBBF24` etc. | `chartSeries[i]` from `theme.ts` |

---

## 7. Quick reference card

```
COLORS
  brand.primary           #7048B8     primary brand purple
  brand.{prePregnancy,pregnancy,kids}  mode pastels — use getModeColor() in components
  stickers.{yellow,blue,pink,green,lilac,peach,coral,charcoal}  + Soft variants
  colors.{bg, surface, surfaceRaised, border, text, textMuted}  semantic, light/dark resolved

RADII
  sm 12  md 20  lg 28  xl 36  xxl 48  full 999
  Card default → md (20)
  Sticker socket → width/2

SPACING
  xs 4  sm 8  md 16  lg 24  xl 32  xxl 48
  Screen horiz padding → lg

TYPE
  font.display       Fraunces 600   headings, numbers      letterSpacing -0.8
  font.italic        Instrument Italic                      letterSpacing -0.4
  font.body          DM Sans 400    body
  font.bodyMedium    DM Sans 500    medium UI
  font.bodySemiBold  DM Sans 600    button labels, MonoCaps
  MonoCaps tracking 1.2 + uppercase + 10px

COMPONENTS
  Card:    <PaperCard tint? flat? radius? padding?>
  Button:  <PillButton variant="ink|paper|accent" height={58|72}>
           <StickerButton color={...} height={52}>
  Input:   <TextField label value onChangeText error?>      (free-text)
           <FormRow label value sticker onPress>            (row-style)
  Error:   <FieldError message />                            (auto via TextField)
  Slider:  <StepSlider min max value onChange color unit?>
  Toast:   useSavedToast().show({ title, message, autoDismiss })
  Alert:   <PaperAlert visible title message buttons={[{variant: 'primary|secondary|danger'}]}>
  Empty:   <EmptyState icon iconBg? title message? ctaLabel? onCtaPress?>
  Skeleton: <Skeleton width height radius? />
  Charts:  <LineChart|BarChart|MoodBubbleCluster|MoodStickerStrip ...>  use chartSeries[i] for multi-series
  Screen:  <CosmicBackground><ScrollView><ScreenHeader/></ScrollView></CosmicBackground>

ANIMATION
  Card entry:  spring(0.88→1, fr 7, t 80) + fade 220ms
  Alert entry: spring(0.92→1, fr 7, t 90) + fade 180ms
  Press:       translateY 0→2 (built into PillButton/StickerButton)
  Drag lift:   timing(140ms, out cubic)

NEVER
  raw hex (except SVG asset files)
  GradientButton, GlassCard, shadows.glow*
  Alert.alert (use SavedToast / PaperAlert)
  lightTokens/darkTokens direct import
  isDark branching for values that exist in colors.*
```

---

## 8. Where the rules live

- **Token definitions** — `constants/theme.ts`
- **Visual canon** — `docs/Claude design studio, new design system log and screens/grandma-studio.html`
- **Enforcement rule for Claude** — top of `CLAUDE.md` + the §5 checklist
- **Code style conventions** — `.claude/rules/code-style.md`

When in doubt: open `theme.ts` and grep for the token. If it doesn't exist, **ask** before adding raw values.
