# /store-add

Scaffold a new Zustand v5 store with the project's conventions.

## Inputs

Ask the user:
1. **Store name** — `useFooStore` (camelCase, must start with `use`)
2. **Shape** — list the state fields + their types, and any actions (setters / async functions)
3. **Persist?** — yes/no. If yes, what storage key? (defaults to the store name)

## Conventions (verbatim, do not deviate)

```ts
// ALWAYS named import — Zustand v5 has no default export
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
```

- File location: `store/useFooStore.ts`
- Filename = store name in camelCase
- State and actions live in ONE interface, not split
- Keep state flat — no nested objects unless the data really is hierarchical
- Derived values: compute inside the component, NOT in the store
- Actions are inline functions on the store, typed via the interface

## Template (persisted variant)

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface FooState {
  count: number
  items: string[]
  setCount: (n: number) => void
  addItem: (item: string) => void
  reset: () => void
}

export const useFooStore = create<FooState>()(
  persist(
    (set) => ({
      count: 0,
      items: [],
      setCount: (n) => set({ count: n }),
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      reset: () => set({ count: 0, items: [] }),
    }),
    {
      name: 'foo-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

## Template (non-persisted variant)

```ts
import { create } from 'zustand'

interface FooState {
  count: number
  setCount: (n: number) => void
}

export const useFooStore = create<FooState>((set) => ({
  count: 0,
  setCount: (n) => set({ count: n }),
}))
```

## Steps

1. Check `store/` for a similarly-named store. If close (e.g. user wants `useChildStore` and `useChildrenStore` exists), STOP and ask whether the new state should be added to the existing store instead. The codebase already has 15+ stores — fight the urge to add another.
2. Generate the file at `store/useFooStore.ts` using the appropriate template.
3. Use `unknown` instead of `any` for fields whose type isn't fully specified.
4. Don't add a default export.

## Constraints

- Never use AsyncStorage directly outside of `persist` — that's what the middleware is for.
- Never put React Query data in a Zustand store. If the state is server data, it should be a `useQuery` call, not a store.
- Never use `default` import for `zustand` — it will fail silently in v5.

## Output

- Filename created
- One-line reminder: "Derive computed values in the component, not the store."
- If the new store overlaps semantically with an existing one, list which one(s).
