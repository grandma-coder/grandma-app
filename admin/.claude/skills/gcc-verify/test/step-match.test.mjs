import { test } from "node:test";
import assert from "node:assert/strict";
import { stepMatches } from "../verify.mjs";

test("--step 1 matches Step 1 but NOT Step 10 / Step 11 (boundary-aware)", () => {
  assert.equal(stepMatches("Step 1: echo check", "1"), true);
  assert.equal(stepMatches("Step 1", "1"), true);
  assert.equal(stepMatches("Step 10: later", "1"), false);
  assert.equal(stepMatches("Step 11", "1"), false);
});

test("exact full-string step match still works", () => {
  assert.equal(stepMatches("1", "1"), true);
  assert.equal(stepMatches("Step 2: x", "2"), true);
  assert.equal(stepMatches("Step 2: x", "3"), false);
});
