import { test } from "node:test";
import assert from "node:assert/strict";
import { renderReport } from "../lib/report.mjs";

const RESULTS = {
  ticket: "DEG-1084",
  date: "2026-06-11",
  scope: "origin/dev..HEAD",
  adhoc: false,
  verdicts: [
    { step: "Step 3", id: "endpoint-200", requirement: "AC-2", verdict: "PASS", detail: "curl → 200" },
    { step: "Step 3", id: "copy-quality", requirement: "AC-5", verdict: "FAIL", detail: "judge: still says ERR_TXN_42" },
    { step: "Step 3", id: "stack-check", requirement: "AC-9", verdict: "SKIPPED", detail: "prereq not available: engine" },
  ],
};

test("renders header, verdicts, and summary", () => {
  const md = renderReport(RESULTS);
  assert.match(md, /# Verify DEG-1084 — 2026-06-11/);
  assert.match(md, /scope: origin\/dev\.\.HEAD/);
  assert.match(md, /PASS\s+endpoint-200/);
  assert.match(md, /FAIL\s+copy-quality/);
  assert.match(md, /SKIPPED\s+stack-check/);
  assert.match(md, /1 PASS · 1 FAIL · 1 SKIPPED · 0 ERROR/);
  assert.match(md, /AC-5 unmet/);
});

test("marks ad-hoc reports", () => {
  const md = renderReport({ ...RESULTS, adhoc: true });
  assert.match(md, /ad-hoc — not from a plan/i);
});
