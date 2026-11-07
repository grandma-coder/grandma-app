import { test } from "node:test";
import assert from "node:assert/strict";
import { runAssert } from "../lib/asserts.mjs";

const allUp = async () => true;
const allDown = async () => false;
const fakeExec = (map) => (cmd) => map[cmd] ?? { stdout: "", code: 127 };

test("PASS when expect matches stdout", async () => {
  const check = { id: "a", kind: "assert", needs: [], run: "echo 200", expect: "200", requirement: "AC-2" };
  const exec = fakeExec({ "echo 200": { stdout: "200\n", code: 0 } });
  const v = await runAssert(check, { exec, probe: allUp });
  assert.equal(v.verdict, "PASS");
  assert.equal(v.requirement, "AC-2");
});

test("FAIL when expect does not match", async () => {
  const check = { id: "a", kind: "assert", needs: [], run: "echo 404", expect: "200" };
  const exec = fakeExec({ "echo 404": { stdout: "404\n", code: 0 } });
  const v = await runAssert(check, { exec, probe: allUp });
  assert.equal(v.verdict, "FAIL");
});

test("SKIPPED when a prereq is down", async () => {
  const check = { id: "a", kind: "assert", needs: ["engine"], run: "curl x", expect: "200" };
  let ran = false;
  const exec = () => { ran = true; return { stdout: "", code: 0 }; };
  const v = await runAssert(check, { exec, probe: allDown });
  assert.equal(v.verdict, "SKIPPED");
  assert.match(v.detail, /engine/);
  assert.equal(ran, false, "command must not run when prereq missing");
});

test("ERROR when the command throws", async () => {
  const check = { id: "a", kind: "assert", needs: [], run: "boom", expect: "exit 0" };
  const exec = () => { throw new Error("spawn failed"); };
  const v = await runAssert(check, { exec, probe: allUp });
  assert.equal(v.verdict, "ERROR");
});

test("non-zero exit FAILs a contains/literal assert even when the text matched", async () => {
  const check = { id: "a", kind: "assert", needs: [], run: "x", expect: "contains: ok" };
  const exec = () => ({ stdout: "ok but then crashed\n", code: 1 });
  const v = await runAssert(check, { exec, probe: allUp });
  assert.equal(v.verdict, "FAIL");
});

test("exit-type assert respects the code (PASS on matching non-zero exit)", async () => {
  const check = { id: "a", kind: "assert", needs: [], run: "x", expect: "exit 1" };
  const exec = () => ({ stdout: "", code: 1 });
  const v = await runAssert(check, { exec, probe: allUp });
  assert.equal(v.verdict, "PASS");
});

test("literal assert PASSes on a zero exit with matching stdout", async () => {
  const check = { id: "a", kind: "assert", needs: [], run: "x", expect: "200" };
  const exec = () => ({ stdout: "200\n", code: 0 });
  const v = await runAssert(check, { exec, probe: allUp });
  assert.equal(v.verdict, "PASS");
});

test("defaultExec times out and throws a clear error (→ ERROR via runAssert)", async () => {
  const { defaultExec } = await import("../lib/asserts.mjs");
  assert.throws(() => defaultExec("sleep 5", { timeoutMs: 120 }), /timed out/i);
});
