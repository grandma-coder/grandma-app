#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parsePlan } from "./lib/parse.mjs";
import { runAssert } from "./lib/asserts.mjs";
import { collectEvidence } from "./lib/evidence.mjs";
import { renderReport } from "./lib/report.mjs";

export function hello() { return "gcc-verify"; }

function getFlag(argv, name, fallback) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}

// Boundary-aware --step matcher: `--step 1` must match "Step 1" / "Step 1: foo"
// but NOT "Step 10" / "Step 11". The filter must be followed by a non-digit (or end).
export function stepMatches(step, filter) {
  if (step === filter) return true;
  const esc = String(filter).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^(?:Step\\s+)?${esc}(?![0-9])`).test(step);
}

async function collect(argv) {
  const planPath = argv[0];
  if (!planPath || planPath.startsWith("--")) {
    process.stderr.write("usage: gcc-verify collect <plan.md> [--diff-range <range>] [--step <N>]\n");
    process.exit(1);
  }
  const diffRange = getFlag(argv, "--diff-range", "origin/main..HEAD");
  const stepFilter = getFlag(argv, "--step", null);
  let planText;
  try {
    planText = readFileSync(planPath, "utf8");
  } catch (e) {
    process.stderr.write(`gcc-verify: could not read plan '${planPath}': ${e.message}\n`);
    process.exit(1);
  }
  let checks;
  try {
    checks = parsePlan(planText);
  } catch (e) {
    process.stderr.write(`gcc-verify: could not parse plan '${planPath}': ${e.message}\n`);
    process.exit(1);
  }
  if (stepFilter) {
    checks = checks.filter((c) => stepMatches(c.step, stepFilter));
  }

  const verdicts = [];
  const judges = [];
  for (const c of checks) {
    if (c.kind === "error") {
      verdicts.push({ step: c.step, id: c.id ?? "(no id)", requirement: "", verdict: "ERROR", detail: c.message });
    } else if (c.kind === "assert") {
      verdicts.push(await runAssert(c));
    } else if (c.kind === "judge") {
      judges.push({ step: c.step, id: c.id, requirement: c.requirement, ask: c.ask,
        evidence: collectEvidence(c.evidence, { diffRange }) });
    }
  }
  process.stdout.write(JSON.stringify({ plan: planPath, scope: diffRange, verdicts, judges }, null, 2));
}

function render(argv) {
  const src = argv[0];
  if (!src) {
    process.stderr.write("usage: gcc-verify render <results.json | ->\n");
    process.exit(1);
  }
  let results;
  try {
    const raw = src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8");
    results = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`gcc-verify: invalid results input '${src}': ${e.message}\n`);
    process.exit(1);
  }
  if (!results.ticket || !results.date) {
    process.stderr.write("gcc-verify: warning — results missing 'ticket' and/or 'date'; did you run the Merge step? Report header will be incomplete.\n");
  }
  process.stdout.write(renderReport(results));
}

const [, , cmd, ...rest] = process.argv;
if (cmd === "collect") await collect(rest);
else if (cmd === "render") render(rest);
else if (cmd) { process.stderr.write(`unknown command: ${cmd}\n`); process.exit(2); }
