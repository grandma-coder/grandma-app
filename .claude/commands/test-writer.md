# /test-writer

Scaffold unit tests for a grandma.app lib/ function or utility.

Ask the user: **What do you want to test?**
Common candidates:
- `lib/cycleLogic.ts` — cycle phase calculations, fertile window, predictions
- `lib/pregnancyWeeks.ts` — week number derivation, due date calculations
- `lib/badgeSync.ts` — badge award conditions
- `lib/leaderboard.ts` — points calculation
- `lib/notificationEngine.ts` — notification trigger conditions
- `lib/modeConfig.ts` — mode-specific config correctness

---

## Setup (if no test config exists)

Check if Jest is configured (`jest.config.js` or `jest` in `package.json`). If not, add:

```bash
npm install --save-dev jest @types/jest ts-jest
```

`jest.config.js`:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
}
```

Add to `package.json`:
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

---

## Test File Location

`__tests__/<filename>.test.ts`  
(e.g. `__tests__/cycleLogic.test.ts`)

---

## Test Writing Rules

1. **Test behavior, not implementation** — test what the function returns, not how it does it
2. **Use descriptive test names** — `it('returns ovulation phase on day 14 of a 28-day cycle')`
3. **One assertion per test** where possible — easier to debug failures
4. **Cover edge cases for health data:**
   - Shortest valid cycle (21 days)
   - Longest valid cycle (35 days)
   - Irregular cycle (cycle length 0 or negative — should not crash)
   - Date boundary conditions (month end, leap year)
   - Missing/undefined inputs

5. **Group with `describe` blocks:**
   ```ts
   describe('getCycleInfo', () => {
     describe('menstruation phase', () => { ... })
     describe('ovulation phase', () => { ... })
     describe('edge cases', () => { ... })
   })
   ```

## Test Template

```ts
import { functionName } from '@/lib/fileName'

describe('functionName', () => {
  it('should <expected behavior> when <condition>', () => {
    // Arrange
    const input = { ... }
    
    // Act
    const result = functionName(input)
    
    // Assert
    expect(result).toEqual({ ... })
  })

  it('handles edge case: <description>', () => {
    expect(functionName(edgeCaseInput)).toBe(expectedValue)
  })
})
```

## For cycleLogic.ts specifically, always test:
- Phase boundaries (day 1, day 5, day 6, day 13, day 14, day 16, day 17, day 28)
- Fertile window: 5 days before ovulation + ovulation + 1 day after
- `ovulationDay = cycleLength - 14` formula
- `isInFertileWindow()` returns true/false correctly
- Custom cycle lengths (21, 28, 30, 35 days)

---

After creating the test file, run:
```bash
npm test -- --testPathPattern=<filename>
```

And show the output. If tests fail, fix them before finishing.
