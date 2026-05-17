# Code Style — grandma.app

> **Design system is canonical**: see [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) at repo root. If anything below disagrees with that file, **`DESIGN_SYSTEM.md` wins**.

## TypeScript
- Strict mode — no `any`, no implicit `any`
- Prefer `interface` over `type` for object shapes
- All Expo Router routes are typed — `router.push('/route')` not `navigation.navigate(...)`
- Named exports for components

## React Native & Expo
- `StyleSheet.create()` for dynamic/computed styles; NativeWind for static layout
- `useSafeAreaInsets()` for safe areas; never hardcode notch padding
- Forms: `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- Images: always set `width` and `height` — never rely on intrinsic size

## State — Zustand v5
```ts
// ALWAYS named import
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
```
- Flat state; derive computed values in components, not the store
- Persisted stores MUST have a `hydrated` flag + `onRehydrateStorage` callback that flips it (see `useBehaviorStore` for the canonical pattern). Without it, the first render reads default state and flashes before AsyncStorage finishes — see the "week 1 → week 40 flash" incident.

## Data Fetching — React Query v5
```ts
// ALWAYS object syntax
const { data } = useQuery({ queryKey: ['key', id], queryFn: () => fetchFn(id) })
const mutation = useMutation({ mutationFn: updateFn })
```

## Design tokens (cream-paper / sticker-collage — 2026 redesign)

**Never hardcode** a color, radius, font, shadow, or font family. Always pull from `constants/theme.ts`:

```ts
const { colors, brand, stickers, radius, spacing, font, isDark } = useTheme()
```

- **Canvas** is cream paper (`bg #F3ECD9` light / warm ink dark). **Never** use `#FFFFFF`, `#1A1030`, `#0F0820`, or any "cosmic" dark purple.
- **Cards**: `radius.lg` (28), background `colors.surface` (paper white) or `colors.surfaceRaised`. No card shadows by default; use `shadows.card` if needed.
- **Buttons**: pill-shaped (`radius.full`, 999), filled. Use `PillButton` or `StickerButton` — never write raw `Pressable` for a primary CTA. **Never** yellow neon `#F4FD50`.
- **Inputs**: `radius.md` (20–24), `colors.surface` background, hairline border.
- **Shadows**: only `shadows.card` / `shadows.cardPop` / `shadows.pop` / `shadows.subtle`. The legacy `shadows.glow*` is gone.
- **Mode color**: `getModeColor(mode, isDark)` — never hardcode rose / lavender / blue per mode.
- **Typography**: `font.display` (Fraunces serif) for headings + numbers, `font.body` (DM Sans) for everything else, `font.italic` (Instrument Serif) for accents. Never `font.displayLegacy` / Cabinet Grotesk / Satoshi (all deleted).
- **Sticker palette**: 7 stickers with `*Soft` (bg tint) and `*Ink` (dark icon) variants. See §1.3 in `DESIGN_SYSTEM.md`.

### Legacy tokens you must NEVER reach for

| Dead token | Replacement |
|---|---|
| `GlassCard` | `PaperCard` |
| `GradientButton` | `PillButton` or `StickerButton` |
| `CosmicBackground` | Plain `View` with `colors.bg` |
| `THEME_COLORS` | `useTheme()` destructure |
| `colors.neon` / `shadows.glow*` | Never; use sticker tokens + `shadows.card` |
| Raw `#F4FD50`, `#1A1030`, `#241845`, `#B983FF`, `#FF8AD8` | tokens from `brand` / `stickers` |
| Cabinet Grotesk / Satoshi / JetBrains Mono | `font.display` / `font.body` / `font.bodyMedium` |

### When to use raw hex

Only inside sticker/illustration SVG path strings — those files **are** the design assets. Listed in `DESIGN_SYSTEM.md` §0. Every other file is tokens-only.

## Component Rules
- One component per file; filename = component name in PascalCase
- Props interface above the component: `interface Props { ... }`
- Mode-conditional rendering uses `useModeStore` — don't pass `mode` as a prop if it's global state
- Persisted stores must respect the hydration gate before deriving state (see Zustand section)

## File Naming
- Screens: `kebab-case.tsx` (Expo Router convention)
- Components: `PascalCase.tsx`
- Stores: `useCamelCase.ts`
- Lib files: `camelCase.ts`

## Pre-write checklist (before saving any UI file)

1. Have I imported `useTheme` from `constants/theme.ts` (not redefined locally)?
2. Are all colors from `colors` / `brand` / `stickers`? No raw hex in JSX style props?
3. Are all radii from `radius` (md / lg / full)? Cards = 28, buttons = 999, inputs = 20–24?
4. Are all fonts from `font.*`? No `fontFamily: 'Fraunces_600SemiBold'` strings?
5. Are all shadows from `shadows.card / cardPop / pop / subtle`? No `shadows.glow*`?
6. Is mode color via `getModeColor(mode, isDark)`?
7. If the file consumes a persisted store, am I waiting on `store.hydrated` before rendering data-derived UI?

If any answer is no, stop and fix before completing the edit.
