import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlan } from "../lib/parse.mjs";

const DOC = [
  "## Step 3: token credit endpoint",
  "",
  "```verify",
  "- id: endpoint-200",
  "  kind: assert",
  "  requirement: \"AC-2: credit endpoint returns 200\"",
  "  needs: [engine]",
  "  run: curl -s -o /dev/null -w '%{http_code}' localhost:3001/api/v1/credit",
  "  expect: \"200\"",
  "- id: copy-quality",
  "  kind: judge",
  "  ask: \"Does the error copy match the AC's friendly tone?\"",
  "  evidence: [diff, apps/engine/app/api/v1/credit/route.ts]",
  "```",
  "",
].join("\n");

test("parses assert and judge checks with step + fields", () => {
  const checks = parsePlan(DOC);
  assert.equal(checks.length, 2);
  const a = checks[0];
  assert.equal(a.step, "Step 3: token credit endpoint");
  assert.equal(a.id, "endpoint-200");
  assert.equal(a.kind, "assert");
  assert.equal(a.requirement, "AC-2: credit endpoint returns 200");
  assert.deepEqual(a.needs, ["engine"]);
  assert.equal(a.run, "curl -s -o /dev/null -w '%{http_code}' localhost:3001/api/v1/credit");
  assert.equal(a.expect, "200");
  const j = checks[1];
  assert.equal(j.kind, "judge");
  assert.equal(j.ask, "Does the error copy match the AC's friendly tone?");
  assert.deepEqual(j.evidence, ["diff", "apps/engine/app/api/v1/credit/route.ts"]);
});

test("missing id becomes an error check", () => {
  const doc = ["## S", "```verify", "- kind: assert", "  run: true", "  expect: \"exit 0\"", "```"].join("\n");
  const checks = parsePlan(doc);
  assert.equal(checks.length, 1);
  assert.equal(checks[0].kind, "error");
  assert.match(checks[0].message, /id/);
});

test("assert missing run/expect becomes an error check", () => {
  const doc = ["## S", "```verify", "- id: x", "  kind: assert", "```"].join("\n");
  const checks = parsePlan(doc);
  assert.equal(checks[0].kind, "error");
  assert.match(checks[0].message, /run|expect/);
});

test("judge missing ask/evidence becomes an error check", () => {
  const doc = ["## S", "```verify", "- id: y", "  kind: judge", "```"].join("\n");
  const checks = parsePlan(doc);
  assert.equal(checks[0].kind, "error");
  assert.match(checks[0].message, /ask|evidence/);
});

test("unknown kind becomes an error check", () => {
  const doc = ["## S", "```verify", "- id: z", "  kind: wat", "```"].join("\n");
  const checks = parsePlan(doc);
  assert.equal(checks[0].kind, "error");
  assert.match(checks[0].message, /kind/);
});

test("unterminated verify fence emits a parser ERROR, not a silent drop", () => {
  const doc = ["## Step 4: open fence", "```verify", "- id: x", "  kind: assert", "  run: true", "  expect: \"exit 0\"", "(EOF with no closing fence)"].join("\n");
  const checks = parsePlan(doc);
  assert.ok(checks.some((c) => c.kind === "error" && /unterminated|closing fence|missing/i.test(c.message)),
    "expected an error check for the unterminated fence");
});

test("array values keep commas inside quotes as one element", () => {
  const doc = [
    "## S",
    "```verify",
    "- id: j",
    "  kind: judge",
    "  ask: \"q\"",
    "  evidence: [diff, \"command: node -e 'log(1, 2)'\", src/a.ts]",
    "```",
  ].join("\n");
  const checks = parsePlan(doc);
  assert.deepEqual(checks[0].evidence, ["diff", "command: node -e 'log(1, 2)'", "src/a.ts"]);
});
