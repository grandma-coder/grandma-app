# /new-screen

Create a new screen for grandma.app.

Ask the user for:
1. The screen name and route (e.g. `app/insights.tsx` or `app/profile/account.tsx`)
2. Which journey mode(s) it applies to (pre-preg / pregnancy / kids / all)
3. What the screen does in 1 sentence

Then scaffold the screen with:

- `CosmicBackground` as the root wrapper
- `ScrollView` with `contentContainerStyle` padding
- Header section with back button (`router.back()`) and title in Cabinet Grotesk style
- All colors from `constants/theme.ts` tokens — never raw hex
- If mode-specific, import `useModeStore` and branch on `mode`
- TypeScript strict — no `any`
- Proper `SafeAreaView` handling

Use this import pattern:
```ts
import { theme } from '@/constants/theme'
import { router } from 'expo-router'
import { useModeStore } from '@/store/useModeStore'
```

Component name must match the file name in PascalCase.
