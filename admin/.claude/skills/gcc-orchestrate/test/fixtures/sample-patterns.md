# Orchestration patterns — recurring failure modes for this repo

Written by the learn gate at run close; read by implement + review gates.
Format is mechanical — validate with `node patterns.mjs lint <this file>`.

## P-001 · zod-parse-api-body [active]
Rule: API route handlers must zod-parse request body before use.
Scope: apps/*/api/**
Evidence: DEG-1236 (2 findings), DEG-1244 (1)
Added: 2026-07-06 · Last hit: 2026-07-06

## P-002 · stale-port-in-verify [retired]
Rule: verify prereqs must read ports from config, never hardcode.
Scope: **/verify.mjs
Evidence: qa-builds (1)
Added: 2026-06-20 · Last hit: 2026-06-22

## P-003 · missing-await-supabase [active]
Rule: Supabase client calls return promises — always await, never fire-and-forget.
Scope: apps/**/*.ts, packages/db/**
Evidence: DEG-1231 (1), DEG-1178 (2)
Added: 2026-07-02 · Last hit: 2026-07-04
