import { test } from "node:test";
import assert from "node:assert/strict";
import { parseExpect, evaluateExpect } from "../lib/expect.mjs";

test("parses the three forms", () => {
  assert.deepEqual(parseExpect("exit 0"), { type: "exit", code: 0 });
  assert.deepEqual(parseExpect("exit 7"), { type: "exit", code: 7 });
  assert.deepEqual(parseExpect("contains: ERR_TXN"), { type: "contains", value: "ERR_TXN" });
  assert.deepEqual(parseExpect("200"), { type: "literal", value: "200" });
});

test("evaluates exit code", () => {
  assert.equal(evaluateExpect(parseExpect("exit 0"), { stdout: "x", code: 0 }), true);
  assert.equal(evaluateExpect(parseExpect("exit 0"), { stdout: "x", code: 1 }), false);
});

test("evaluates contains", () => {
  assert.equal(evaluateExpect(parseExpect("contains: foo"), { stdout: "a foo b", code: 0 }), true);
  assert.equal(evaluateExpect(parseExpect("contains: foo"), { stdout: "abc", code: 0 }), false);
});

test("evaluates literal stdout (trimmed)", () => {
  assert.equal(evaluateExpect(parseExpect("200"), { stdout: "200\n", code: 0 }), true);
  assert.equal(evaluateExpect(parseExpect("200"), { stdout: "404", code: 0 }), false);
});
