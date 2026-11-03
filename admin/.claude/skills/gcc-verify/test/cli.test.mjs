import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "verify.mjs");
const plan = join(here, "fixtures", "sample-plan.md");

test("collect prints JSON with assert verdict and judge bundle", () => {
  const r = spawnSync("node", [cli, "collect", plan, "--diff-range", "HEAD~0..HEAD"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  const echo = out.verdicts.find((v) => v.id === "echo-ok");
  assert.equal(echo.verdict, "PASS");
  const judge = out.judges.find((j) => j.id === "copy-tone");
  assert.equal(judge.ask, "Is the tone friendly?");
  assert.equal(judge.evidence.commands["echo sample-evidence"].trim(), "sample-evidence");
});

test("render turns merged results into markdown", () => {
  const results = JSON.stringify({
    ticket: "DEG-1", date: "2026-06-11", scope: "X",
    verdicts: [{ step: "S", id: "a", requirement: "AC-1", verdict: "PASS", detail: "ok" }],
  });
  const r = spawnSync("node", [cli, "render", "-"], { input: results, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /# Verify DEG-1/);
  assert.match(r.stdout, /1 PASS/);
});

test("--step N filters to a single step heading", () => {
  const r1 = spawnSync("node", [cli, "collect", plan, "--diff-range", "HEAD~0..HEAD", "--step", "1"], { encoding: "utf8" });
  assert.equal(r1.status, 0, r1.stderr);
  const out1 = JSON.parse(r1.stdout);
  assert.ok(out1.verdicts.find((v) => v.id === "echo-ok"), "echo-ok should be present for --step 1");

  const r2 = spawnSync("node", [cli, "collect", plan, "--diff-range", "HEAD~0..HEAD", "--step", "9"], { encoding: "utf8" });
  assert.equal(r2.status, 0, r2.stderr);
  const out2 = JSON.parse(r2.stdout);
  assert.equal(out2.verdicts.length, 0);
  assert.equal(out2.judges.length, 0);
});

test("collect with no plan path exits 1 with usage", () => {
  const r = spawnSync("node", [cli, "collect"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /usage: gcc-verify collect/);
});

test("render with no source exits 1 with usage", () => {
  const r = spawnSync("node", [cli, "render"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /usage: gcc-verify render/);
});

test("collect with a missing plan file exits 1 with a concise message, not a stack trace", () => {
  const r = spawnSync("node", [cli, "collect", "/no/such/plan-file.md", "--diff-range", "HEAD~0..HEAD"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stderr, /\n\s+at\s|node:internal/);  // no raw Node stack trace
  assert.match(r.stderr, /could not read plan|ENOENT|no such file/i);
});

test("render with invalid JSON exits 1 with a concise message, not a stack trace", () => {
  const r = spawnSync("node", [cli, "render", "-"], { input: "{ not valid json", encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stderr, /\n\s+at\s|node:internal/);
  assert.match(r.stderr, /invalid results input|JSON/i);
});

test("--step 1 does not pull in Step 10 via the CLI", () => {
  // sample-plan.md has only Step 1; assert --step 1 keeps it and --step 10 selects nothing.
  const r1 = spawnSync("node", [cli, "collect", plan, "--diff-range", "HEAD~0..HEAD", "--step", "1"], { encoding: "utf8" });
  assert.equal(r1.status, 0, r1.stderr);
  assert.ok(JSON.parse(r1.stdout).verdicts.find((v) => v.id === "echo-ok"));
  const r10 = spawnSync("node", [cli, "collect", plan, "--diff-range", "HEAD~0..HEAD", "--step", "10"], { encoding: "utf8" });
  assert.equal(r10.status, 0, r10.stderr);
  const out10 = JSON.parse(r10.stdout);
  assert.equal(out10.verdicts.length + out10.judges.length, 0);
});
