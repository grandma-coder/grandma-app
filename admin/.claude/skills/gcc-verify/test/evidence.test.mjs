import { test } from "node:test";
import assert from "node:assert/strict";
import { collectEvidence } from "../lib/evidence.mjs";

test("collects diff, file, and command selectors", () => {
  const deps = {
    diffRange: "origin/dev..HEAD",
    git: (range) => `DIFF for ${range}`,
    readFile: (p) => `contents of ${p}`,
    exec: (cmd) => ({ stdout: `out of ${cmd}`, code: 0 }),
  };
  const bundle = collectEvidence(["diff", "src/a.ts", "command: ls -1"], deps);
  assert.equal(bundle.diff, "DIFF for origin/dev..HEAD");
  assert.equal(bundle.files["src/a.ts"], "contents of src/a.ts");
  assert.equal(bundle.commands["ls -1"], "out of ls -1");
});

test("missing file is recorded as an error string, not a throw", () => {
  const deps = {
    diffRange: "R",
    git: () => "d",
    readFile: () => { throw new Error("ENOENT"); },
    exec: () => ({ stdout: "", code: 0 }),
  };
  const bundle = collectEvidence(["missing.ts"], deps);
  assert.match(bundle.files["missing.ts"], /ENOENT|could not read/i);
});

test("git failure is recorded as an error string, not a throw", () => {
  const deps = {
    diffRange: "origin/dev..HEAD",
    git: () => { throw new Error("unknown revision origin/dev"); },
    readFile: () => "x",
    exec: () => ({ stdout: "", code: 0 }),
  };
  const bundle = collectEvidence(["diff"], deps);
  assert.match(bundle.diff, /could not get diff/i);
  assert.match(bundle.diff, /unknown revision/);
});

test("command failure is recorded as an error string, not a throw", () => {
  const deps = {
    diffRange: "R",
    git: () => "d",
    readFile: () => "x",
    exec: () => { throw new Error("spawn bash ENOENT"); },
  };
  const bundle = collectEvidence(["command: ls"], deps);
  assert.match(bundle.commands["ls"], /command failed to run/i);
});

test("a non-zero exit command is recorded as a failure marker, not normal evidence", () => {
  const deps = {
    diffRange: "R",
    git: () => "d",
    readFile: () => "x",
    exec: () => ({ stdout: "partial output then error", code: 2 }),
  };
  const bundle = collectEvidence(["command: flaky"], deps);
  assert.match(bundle.commands["flaky"], /exited 2|<<.*>>/);
});
