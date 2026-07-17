import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function defaultGit(range, { timeoutMs = 30000 } = {}) {
  const r = spawnSync("git", ["diff", range], { encoding: "utf8", timeout: timeoutMs, killSignal: "SIGKILL" });
  if (r.error) {
    if (r.error.code === "ETIMEDOUT") throw new Error(`git diff timed out after ${timeoutMs}ms`);
    throw r.error;
  }
  if (r.status !== 0) throw new Error((r.stderr || "").trim() || `git diff exited with code ${r.status}`);
  return r.stdout ?? "";
}
export function defaultExec(cmd, { timeoutMs = 30000 } = {}) {
  const r = spawnSync("bash", ["-c", cmd], { encoding: "utf8", timeout: timeoutMs, killSignal: "SIGKILL" });
  if (r.error) {
    if (r.error.code === "ETIMEDOUT") throw new Error(`command timed out after ${timeoutMs}ms: ${cmd}`);
    throw r.error;
  }
  return { stdout: (r.stdout ?? "") + (r.stderr ?? ""), code: r.status ?? 1 };
}
export function defaultReadFile(p) {
  return readFileSync(p, "utf8");
}

export function collectEvidence(selectors, deps = {}) {
  const { diffRange = "origin/main..HEAD", git = defaultGit, readFile = defaultReadFile, exec = defaultExec } = deps;
  const bundle = { diff: null, files: {}, commands: {} };
  for (const sel of selectors) {
    if (sel === "diff") {
      try {
        bundle.diff = git(diffRange);
      } catch (e) {
        bundle.diff = `<<could not get diff: ${e.message}>>`;
      }
    } else if (sel.startsWith("command:")) {
      const cmd = sel.slice("command:".length).trim();
      try {
        const r = exec(cmd);
        bundle.commands[cmd] = r.code === 0
          ? r.stdout
          : `<<command exited ${r.code}: ${String(r.stdout).trim()}>>`;
      } catch (e) {
        bundle.commands[cmd] = `<<command failed to run: ${e.message}>>`;
      }
    } else {
      try {
        bundle.files[sel] = readFile(sel);
      } catch (e) {
        bundle.files[sel] = `<<could not read: ${e.message}>>`;
      }
    }
  }
  return bundle;
}
