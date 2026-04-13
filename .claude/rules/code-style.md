# Code Style — grandma.app

## TypeScript
- Strict mode — no `any`, no implicit `any`
- Prefer `interface` over `type` for object shapes
- All Expo Router routes are typed — use `router.push('/route')` not `navigation.navigate()`
- Export components as named exports, not default where possible in component files

## React Native & Expo
- Use `StyleSheet.create()` for dynamic/computed styles
- Use NativeWind (Tailwind classes) for static layout styles
- Always use `SafeAreaView` or `useSafeAreaInsets()` — never hardcode padding for notches
- `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` on forms
- Images: always define `width` and `height` — never rely on intrinsic size in RN

## State — Zustand v5
```ts
// ALWAYS named import
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
```
- Keep stores flat — no nested objects unless necessary
- Derive computed values inside the component, not in the store

## Data Fetching — React Query v5
```ts
// ALWAYS object syntax
const { data } = useQuery({ queryKey: ['key', id], queryFn: () => fetchFn(id) })
const mutation = useMutation({ mutationFn: updateFn })
```

## Styling Rules
- **Never use raw hex values inline** — always import from `constants/theme.ts`
- Background is always `theme.background` (`#1A1030`) — never white or light
- Card backgrounds use `theme.surface` or `theme.surfaceGlass`
- Primary CTA: neon yellow `#F4FD50` with dark text `#1A1030`
- Border radius: buttons=999px, cards=32px, inputs=36px
- All shadows should use the color of the element (glow effect), not black

## Component Rules
- One component per file
- Filename = component name in PascalCase
- Props interface defined above the component: `interface Props { ... }`
- Mode-conditional rendering uses `useModeStore` — don't pass mode as a prop if it's global state
- `GlassCard` for all card-like containers
- `GradientButton` for all primary CTAs
- `CosmicBackground` as root wrapper on full-page screens

## File Naming
- Screens: `kebab-case.tsx` (Expo Router convention)
- Components: `PascalCase.tsx`
- Stores: `useCamelCase.ts`
- Lib files: `camelCase.ts`
