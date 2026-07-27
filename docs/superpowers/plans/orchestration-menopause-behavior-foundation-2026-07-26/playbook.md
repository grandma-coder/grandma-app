---
title: Orchestration playbook — Menopause Behavior E1 Foundation
ticket: menopause-behavior-foundation
source_plan: docs/superpowers/plans/2026-07-25-menopause-behavior-foundation.md
execution: sequential
isolation: main
autonomy: per-wave
branch: main
date: 2026-07-26
status: active
---

## Dependency graph
```mermaid
flowchart TD
  U1[U1 foundation]
  U2[U2 migration]
  U3[U3 symptoms]
  U4[U4 store+stage]
  U5[U5 analytics lib]
  U6[U6 onboarding]
  U7[U7 log forms]
  U8[U8 home]
  U9[U9 analytics screen]
  U10[U10 dev panel]
  U3 --> U5
  U1 --> U6
  U3 --> U6
  U4 --> U6
  U2 --> U7
  U3 --> U7
  U4 --> U7
  U1 --> U8
  U3 --> U8
  U4 --> U8
  U7 --> U8
  U5 --> U9
  U1 --> U10
  U3 --> U10
  U4 --> U10
  U6 --> U10
```

## Wave plan
| Wave | Units | Parallelism | File-set notes |
|------|-------|-------------|----------------|
| 1 | U1, U2, U3, U4 | serialize (sequential mode) | disjoint: foundation / migration / symptoms lib / store+stage lib |
| 2 | U5, U6, U7 | serialize | disjoint: analytics lib+insights / onboarding / log forms+agenda |
| 3 | U8, U9 | serialize | disjoint: home+index / analytics screen+vault |
| 4 | U10 | single | devSeed + dev-panel |

## Unit status
| Unit | Goal | Status | Commit | Verify | Review |
|------|------|--------|--------|--------|--------|
| U1 | Behavior foundation: JourneyMode/Behavior unions + menopause… | pending | — | — | — |
| U2 | menopause_logs table + profiles.menopause_stage/last_period_… | pending | — | — | — |
| U3 | Symptom taxonomy lib/menopauseSymptoms.ts (13 symptoms, 5 gr… | pending | — | — | — |
| U4 | useMenopauseStore (stage/lastPeriodDate + hydration gate) + … | pending | — | — | — |
| U5 | lib/menopauseAnalytics.ts pure hooks (symptom stats, vasomot… | pending | — | — | — |
| U6 | Direct onboarding: useMenopauseOnboardingStore (ephemeral) +… | pending | — | — | — |
| U7 | Symptom log sheet + saveMenopauseLog helper + agenda timelin… | pending | — | — | — |
| U8 | MenopauseHome (stage hero, months counter, 12mo offer, quick… | pending | — | — | — |
| U9 | MenopauseAnalytics screen (vasomotor, symptom stats, trends)… | pending | — | — | — |
| U10 | Dev Panel tools + seedMenopauseData (mode button, stage pick… | pending | — | — | — |

## Notes
- Isolation = main (user works directly on main; no end-of-run PR — commits land on main, push on completion).
- Per-wave checkpoints: pause after each wave for review.
