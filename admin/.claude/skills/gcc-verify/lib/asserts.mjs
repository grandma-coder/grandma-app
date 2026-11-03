import { spawnSync } from "node:child_process";
import { parseExpect, evaluateExpect } from "./expect.mjs";
import { missingPrereqs, tcpProbe } from "./prereqs.mjs";

export function defaultExec(run, { timeoutMs = 30000 } = {}) {
  const r = spawnSync("bash", ["-c", run], { encoding: "utf8", timeout: timeoutMs, killSignal: "SIGKILL" });
  if (r.error) {
    if (r.error.code === "ETIMEDOUT") throw new Error(`command timed out after ${timeoutMs}ms: ${run}`);
    throw r.error;
  }
  return { stdout: (r.stdout ?? "") + (r.stderr ?? ""), code: r.status ?? 1 };
}

export async function runAssert(check, { exec = defaultExec, probe = tcpProbe } = {}) {
  const base = { step: check.step, id: check.id, kind: "assert", requirement: check.requirement ?? "" };
  const needs = check.needs ?? [];
  const missing = await missingPrereqs(needs, { probe });
  if (missing.length > 0) {
    return { ...base, verdict: "SKIPPED", detail: `prereq not available: ${missing.join(", ")}` };
  }
  let result;
  try {
    result = exec(check.run);
  } catch (e) {
    return { ...base, verdict: "ERROR", detail: `command failed to run: ${e.message}` };
  }
  const spec = parseExpect(check.expect);
  let ok = evaluateExpect(spec, result);
  // A non-zero exit fails a non-`exit` assert even if the expected text appeared —
  // a command that errored out has not satisfied its requirement. `exit`-type checks
  // are about the code itself, so they keep evaluateExpect's verdict.
  if (spec.type !== "exit" && result.code !== 0) ok = false;
  const shown = String(result.stdout).trim().split("\n")[0]?.slice(0, 80) ?? "";
  return { ...base, verdict: ok ? "PASS" : "FAIL", detail: `${check.run} → ${shown} (exit ${result.code})` };
}
