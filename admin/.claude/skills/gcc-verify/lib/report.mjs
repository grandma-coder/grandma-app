const ORDER = ["PASS", "FAIL", "SKIPPED", "ERROR"];

export function renderReport(results) {
  const { ticket, date, scope, verdicts, adhoc = false } = results;
  const lines = [];
  lines.push(`# Verify ${ticket} — ${date}   (scope: ${scope})`);
  if (adhoc) lines.push("\n> **ad-hoc — not from a plan `verify` block.** Checks derived from  AC on the fly.");
  lines.push("");

  const steps = [...new Set(verdicts.map((v) => v.step))];
  for (const step of steps) {
    lines.push(`${step}`);
    for (const v of verdicts.filter((x) => x.step === step)) {
      const pad = v.verdict.padEnd(7);
      const req = v.requirement ? `${v.requirement}   ` : "";
      lines.push(`  ${pad} ${v.id}   ${req}${v.detail}`);
    }
    lines.push("");
  }

  const counts = Object.fromEntries(ORDER.map((k) => [k, verdicts.filter((v) => v.verdict === k).length]));
  const summary = ORDER.map((k) => `${counts[k]} ${k}`).join(" · ");
  const unmet = verdicts.filter((v) => v.verdict === "FAIL" || v.verdict === "ERROR").map((v) => v.requirement || v.id);
  const tail = unmet.length ? `   →   ${unmet.join(", ")} unmet` : "   →   all checks satisfied";
  lines.push(`Summary: ${summary}${tail}`);
  return lines.join("\n");
}
