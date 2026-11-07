// patterns.mjs — parse / match / lint the per-repo orchestration pattern library.
//
// patterns.md is the repo's distilled recurring-error memory: the learn gate
// writes it at run close; implement + review gates read the subset matching a
// unit's files. This file makes the format mechanical (same philosophy as
// ledger.mjs: prose rules drift, validators don't).
//
// Usage:
//   node patterns.mjs match <patterns.md> [file...]   # active patterns whose Scope matches; no files = all active
//   node patterns.mjs lint  <patterns.md>             # cap + format check; exit 1 on issues
//
// Entry format (one block per pattern):
//   ## P-014 · zod-parse-api-body [active]
//   Rule: API route handlers must zod-parse request body before use.
//   Scope: apps/*/api/**
//   Evidence: DEG-1236 (2 findings), DEG-1244 (1)
//   Added: 2026-07-06 · Last hit: 2026-07-06

import { readFileSync } from 'node:fs';

export const ACTIVE_CAP = 30;   // max active patterns — merge/retire before adding past this
export const BYTES_CAP = 2048;  // max bytes of the rendered active section (prompt-injection budget)

export function globToRegex(glob) {
  const esc = glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + esc
    .replace(/\*\*\//g, '\x00GS\x00')
    .replace(/\*\*/g, '\x00G\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00GS\x00/g, '(?:.*/)?')
    .replace(/\x00G\x00/g, '.*') + '$');
}

export function parse(text) {
  const patterns = [];
  const malformed = [];
  for (const block of text.split(/^## /m).slice(1)) {
    const [head, ...lines] = block.split('\n');
    const m = head.match(/^(P-\d+) · ([a-z0-9-]+) \[(active|retired)\]/);
    if (!m) { malformed.push(head.trim().slice(0, 60)); continue; }
    const field = (name) => {
      const l = lines.find((x) => x.startsWith(name + ':'));
      return l ? l.slice(name.length + 1).trim() : '';
    };
    const added = field('Added');
    patterns.push({
      id: m[1], slug: m[2], status: m[3],
      rule: field('Rule'), scope: field('Scope'), evidence: field('Evidence'),
      added: added.split('·')[0].trim() || null,
      last_hit: (added.match(/Last hit:\s*(\S+)/) || [])[1] || null,
    });
  }
  return { patterns, malformed };
}

export function match(patterns, files) {
  return patterns.filter((p) => p.status === 'active' && p.scope &&
    p.scope.split(/\s*,\s*/).some((g) => {
      const re = globToRegex(g);
      return files.some((f) => re.test(f));
    }));
}

// The exact text gates inject into prompts — one line per pattern, capped by lint.
export function renderActive(patterns, files = null) {
  const subset = files ? match(patterns, files) : patterns.filter((p) => p.status === 'active');
  return subset.map((p) => `- ${p.id}: ${p.rule} [${p.scope}]`).join('\n');
}

export function lint(text) {
  const { patterns, malformed } = parse(text);
  const issues = malformed.map((d) => ({ kind: 'malformed', detail: d }));
  const seen = new Set();
  for (const p of patterns) {
    if (seen.has(p.id)) issues.push({ kind: 'duplicate-id', detail: p.id });
    seen.add(p.id);
    if (p.status === 'active' && (!p.rule || !p.scope))
      issues.push({ kind: 'missing-field', detail: `${p.id} needs Rule and Scope` });
  }
  const active = patterns.filter((p) => p.status === 'active');
  if (active.length > ACTIVE_CAP)
    issues.push({ kind: 'over-cap', detail: `${active.length} active > ${ACTIVE_CAP} — merge or retire before adding` });
  const bytes = Buffer.byteLength(renderActive(patterns));
  if (bytes > BYTES_CAP)
    issues.push({ kind: 'over-bytes', detail: `rendered active section ${bytes}B > ${BYTES_CAP}B — tighten rules or retire` });
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, path, ...files] = process.argv.slice(2);
  if (!cmd || !path) {
    process.stderr.write('usage: node patterns.mjs match|lint <patterns.md> [file...]\n');
    process.exit(1);
  }
  let text = '';
  try { text = readFileSync(path, 'utf8'); } catch {
    // match: absent file = no patterns yet; lint: a typo'd path must not pass silently
    if (cmd === 'lint') {
      process.stderr.write(`cannot read ${path}\n`);
      process.exit(1);
    }
  }
  if (cmd === 'match') {
    const { patterns } = parse(text);
    const out = renderActive(patterns, files.length ? files : null);
    process.stdout.write(out ? out + '\n' : '');
  } else if (cmd === 'lint') {
    const issues = lint(text);
    for (const i of issues) process.stdout.write(`${i.kind}: ${i.detail}\n`);
    process.stdout.write(`${issues.length} issue(s)\n`);
    process.exit(issues.length ? 1 : 0);
  } else {
    process.stderr.write(`unknown command: ${cmd}\n`);
    process.exit(1);
  }
}
