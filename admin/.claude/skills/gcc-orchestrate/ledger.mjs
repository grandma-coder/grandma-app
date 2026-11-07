// ledger.mjs — canonical execution-ledger schema: validate / render / stats.
//
// The ledger (ledger.jsonl) is the run's single trace: resume authority, audit
// trail, and cost record. Prose rules drift (field data: 4 runs produced 4
// taxonomies; 3 of 4 never closed their ledger) — this file makes the schema
// mechanical, the same way verify.mjs makes acceptance checks mechanical.
//
// Usage:
//   node ledger.mjs validate <ledger.jsonl> [--closed]   # exit 1 on errors
//   node ledger.mjs render   <ledger.jsonl>              # markdown Unit status table
//   node ledger.mjs stats    <ledger.jsonl>              # JSON attestation blob
//
// Canonical entry types (closed enum — anything else is a validation error):
//   run-header · unit-plan · gate · progress · decision · side-effect-check ·
//   reviewer-comment · publish · learn
//
// A gate entry's `gate` field is the ROLE (implement|verify|review|test|pr|
// collision|other), never a skill name — the exact skill lives in `invocation`.
// This is what lets stats aggregate across projects with different prefixes.

import { readFileSync } from 'node:fs';

export const ENTRY_TYPES = [
  'run-header', 'unit-plan', 'gate', 'progress', 'decision',
  'side-effect-check', 'reviewer-comment', 'publish', 'learn',
];
export const GATE_ROLES = ['implement', 'simplify', 'verify', 'review', 'test', 'pr', 'collision', 'other'];
export const GATE_RESULTS = ['pass', 'fail', 'advisory', 'waived', 'skipped'];

// Builder-rendered pricing table ($/MTok per model alias). In the raw template this
// string is the literal token and JSON.parse fails → embeddedPricing() returns null;
// cost pricing then must be passed explicitly (tests) or the CLI refuses (clear error).
const PRICING_JSON = '{"opus":{"input":5,"output":25},"sonnet":{"input":3,"output":15},"haiku":{"input":1,"output":5},"fable":{"input":10,"output":50}}';
export function embeddedPricing() {
  try { return JSON.parse(PRICING_JSON); } catch { return null; }
}

// Sum assistant-message usage in a session transcript over a time window and price it.
// Anthropic billing multipliers: cache write ×1.25, cache read ×0.1 of input price.
export function transcriptCost(text, { since, until, pricing } = {}) {
  const s = since ? Date.parse(since) : -Infinity;
  const u = until ? Date.parse(until) : Infinity;
  if ((since && Number.isNaN(s)) || (until && Number.isNaN(u)))
    throw new RangeError('invalid ISO date for --since/--until'); // NaN bounds would silently include everything
  let tokens_in = 0, tokens_out = 0, usd = 0, priced = true, matched = 0;
  const models = new Set();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    const g = e.message?.usage;
    if (e.type !== 'assistant' || !g) continue;
    const t = Date.parse(e.timestamp);
    if (Number.isNaN(t) || t < s || t > u) continue;
    matched++;
    const alias = ['opus', 'sonnet', 'haiku', 'fable'].find((a) => String(e.message.model || '').includes(a));
    if (alias) models.add(alias);
    tokens_in += (g.input_tokens || 0) + (g.cache_creation_input_tokens || 0) + (g.cache_read_input_tokens || 0);
    tokens_out += g.output_tokens || 0;
    const p = pricing?.[alias];
    if (!p) { priced = false; continue; }
    const inEquiv = (g.input_tokens || 0) + 1.25 * (g.cache_creation_input_tokens || 0) + 0.1 * (g.cache_read_input_tokens || 0);
    usd += (inEquiv * p.input + (g.output_tokens || 0) * p.output) / 1e6;
  }
  return {
    tokens_in, tokens_out,
    cost_usd: Math.round(usd * 1000) / 1000,
    // ponytail: zero matched messages means nothing was measured, not measured-zero-cost
    basis: matched === 0 ? 'floor' : (priced ? 'real' : 'floor'),
    models: [...models],
  };
}

export function normalizeRole(gate = '', invocation = '') {
  const s = (gate || invocation).toLowerCase();
  if (GATE_ROLES.includes(s)) return s;
  if (/simplif|ponytail/.test(s)) return 'simplify';
  if (/verify/.test(s)) return 'verify';
  if (/review/.test(s)) return 'review';
  if (/ce-work|implement/.test(s)) return 'implement';
  if (/collision/.test(s)) return 'collision';
  if (/-pr\b|pr create/.test(s)) return 'pr';
  return 'other';
}

export function parse(text) {
  const entries = [];
  const errors = [];
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try {
      entries.push({ ...JSON.parse(line), _line: i + 1 });
    } catch {
      errors.push({ line: i + 1, kind: 'bad-json', detail: line.slice(0, 80) });
    }
  });
  return { entries, errors };
}

const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

export function validate(text, { closed = false } = {}) {
  const { entries, errors } = parse(text);
  const warnings = [];
  const err = (e, kind, detail) => errors.push({ line: e._line, kind, detail });
  const warn = (e, kind, detail) => warnings.push({ line: e._line, kind, detail });

  const header = entries[0];
  if (!header || header.type !== 'run-header') {
    errors.push({ line: 1, kind: 'no-header', detail: 'first line must be a run-header' });
    return { errors, warnings, entries };
  }
  for (const f of ['branch', 'run_dir', 'execution', 'isolation', 'autonomy', 'start', 'units', 'waves'])
    if (header[f] === undefined) err(header, 'header-field', `missing ${f}`);
  const roster = new Set(header.units || []);
  if (header.total_units !== undefined && header.total_units !== roster.size)
    err(header, 'header-invariant', `total_units=${header.total_units} != units.length=${roster.size}`);
  const waveUnits = new Set((header.waves || []).flatMap((w) => w.units || []));
  if (header.waves && !setEq(roster, waveUnits))
    err(header, 'header-invariant', 'union(waves[].units) != units roster');

  const planned = new Set();
  let terminal = null;

  for (const e of entries.slice(1)) {
    if (!ENTRY_TYPES.includes(e.type)) {
      err(e, 'unknown-type', `type "${e.type}" not in canonical enum (a gate belongs in type:"gate" with gate:<role>)`);
      continue;
    }
    switch (e.type) {
      case 'run-header':
        err(e, 'duplicate-header', 'run-header must be the first line only');
        break;
      case 'unit-plan': {
        for (const f of ['unit', 'goal', 'planned_files', 'ac'])
          if (e[f] === undefined) err(e, 'missing-field', `unit-plan.${f}`);
        if (e.unit && !roster.has(e.unit)) err(e, 'unknown-unit', e.unit);
        planned.add(e.unit);
        break;
      }
      case 'gate': {
        for (const f of ['unit', 'gate', 'invocation', 'result', 'ts'])
          if (e[f] === undefined) err(e, 'missing-field', `gate.${f}`);
        if (e.unit && e.unit !== 'FINAL' && !roster.has(e.unit)) err(e, 'unknown-unit', e.unit);
        if (e.gate && !GATE_ROLES.includes(e.gate))
          err(e, 'bad-role', `gate:"${e.gate}" — must be one of ${GATE_ROLES.join('|')} (skill name goes in invocation)`);
        if (e.result && !GATE_RESULTS.includes(e.result)) err(e, 'bad-result', e.result);
        const role = normalizeRole(e.gate, e.invocation);
        // a skipped gate (e.g. a timed-out shadow probe) has no report or checks to cite —
        // its evidence is the skip reason in raw:
        if (role === 'review' && e.result !== 'skipped' && !e.report)
          err(e, 'missing-report', 'a review gate entry must cite report: RUN_DIR/reports/review-<unit>.md');
        if ((role === 'verify' || role === 'review') && e.result !== 'skipped' && !Array.isArray(e.checks))
          err(e, 'missing-checks', `${role} gate needs a checks[] breakdown`);
        if (!e.timing) warn(e, 'no-timing', 'gate entry has no timing{started_at,ended_at,duration_ms}');
        if (!e.provenance) warn(e, 'no-provenance', 'gate entry has no provenance{model,session}');
        if (role === 'implement' && !e.files)
          warn(e, 'no-files', 'implement gate has no files{attempts,files_actual,files_drift}');
        if (e.usage && !['real', 'floor'].includes(e.usage.basis))
          err(e, 'bad-usage', 'usage.basis must be "real" or "floor"');
        if (e.shadow === true && !e.provenance?.model)
          err(e, 'shadow-no-model', 'a shadow probe gate must carry provenance.model — it exists to compare models');
        break;
      }
      case 'progress': {
        for (const f of ['ts', 'done', 'failed', 'blocked', 'pending'])
          if (e[f] === undefined) err(e, 'missing-field', `progress.${f}`);
        const parts = [e.done, e.failed, e.blocked, e.pending].map((x) => x || []);
        const all = parts.flat();
        if (!setEq(new Set(all), roster) || all.length !== roster.size)
          err(e, 'partition', 'done ∪ failed ∪ blocked ∪ pending must equal the roster exactly (disjoint)');
        if (e.status) terminal = e;
        break;
      }
      case 'reviewer-comment': {
        for (const f of ['verdict', 'action'])
          if (e[f] === undefined) err(e, 'missing-field', `reviewer-comment.${f}`);
        if (e.verdict && !['real', 'false-positive'].includes(e.verdict)) err(e, 'bad-verdict', e.verdict);
        if (!e.reviewer) warn(e, 'no-reviewer', 'reviewer-comment has no reviewer id');
        break;
      }
      case 'side-effect-check':
        for (const f of ['action', 'result']) if (e[f] === undefined) err(e, 'missing-field', `side-effect-check.${f}`);
        break;
      case 'decision':
        if (!e.claim && !e.decision) err(e, 'missing-field', 'decision needs claim or decision');
        break;
      case 'publish':
        if (e.result === undefined) err(e, 'missing-field', 'publish.result');
        break;
      case 'learn':
        if (!e.result && !e.doc && !e.skipped) warn(e, 'thin-learn', 'learn entry records neither result, doc, nor skipped reason');
        break;
    }
  }

  for (const u of roster)
    if (!planned.has(u)) warn(header, 'no-unit-plan', `unit ${u} has no unit-plan entry`);

  const last = entries[entries.length - 1];
  if (terminal && last !== terminal)
    err(last, 'entries-after-close', 'terminal progress entry must be the last line');
  if (terminal) {
    if ((terminal.pending || []).length && terminal.status === 'complete')
      err(terminal, 'terminal-invariant', 'status:complete with non-empty pending');
    for (const f of ['status', 'end']) if (terminal[f] === undefined) err(terminal, 'missing-field', `terminal progress.${f}`);
  } else if (closed) {
    errors.push({ line: (last?._line) || 1, kind: 'not-closed', detail: 'no terminal progress entry (status + end) — the run was never closed' });
  }

  return { errors, warnings, entries };
}

// Replay classification — same rules as the skill's Resumability section.
export function classify(entries) {
  const header = entries[0] || {};
  const units = header.units || [];
  const state = {};
  for (const u of units) state[u] = { status: 'pending', commit: null, verify: null, review: null, goal: null };
  for (const e of entries) {
    if (e.type === 'unit-plan' && state[e.unit]) state[e.unit].goal = e.goal;
    if (e.type === 'gate' && e.shadow === true) continue; // probes never drive unit state
    if (e.type === 'gate' && state[e.unit]) {
      const role = normalizeRole(e.gate, e.invocation);
      const s = state[e.unit];
      if (role === 'implement' && e.result === 'pass') { s.implement = true; s.commit = e.commit || s.commit; }
      if (role === 'verify') s.verify = e.result;
      if (role === 'review') s.review = e.report ? e.result : null;
    }
    if (e.type === 'decision' && state[e.unit] && e.outcome)
      state[e.unit].status = e.outcome; // 'failed' | 'blocked'
  }
  for (const u of units) {
    const s = state[u];
    if (s.status === 'pending' && s.implement && s.verify === 'pass' && s.review && s.review !== 'fail')
      s.status = 'done';
  }
  return { header, state };
}

export function render(text) {
  const { entries } = parse(text);
  const { header, state } = classify(entries);
  const rows = (header.units || []).map((u) => {
    const s = state[u];
    return `| ${u} | ${s.goal || '—'} | ${s.status} | ${s.commit ? s.commit.slice(0, 9) : '—'} | ${s.verify || '—'} | ${s.review || '—'} |`;
  });
  return [
    '## Unit status',
    '| Unit | Goal | Status | Commit | Verify | Review |',
    '|------|------|--------|--------|--------|--------|',
    ...rows,
  ].join('\n');
}

export function stats(text) {
  const { entries } = parse(text);
  const { header, state } = classify(entries);
  const out = {
    work: header.ticket || header.work || null,
    branch: header.branch || null,
    units: { total: (header.units || []).length, done: 0, failed: 0, blocked: 0, pending: 0 },
    gates: {},
    reviewer_comments: { real: 0, false_positive: 0 },
    drift: { units_with_drift: 0, files_added: 0, files_removed: 0 },
    duration_ms: null,
    cost: null,
  };
  for (const u of Object.values(state)) out.units[u.status] = (out.units[u.status] || 0) + 1;
  let cost = 0, costGates = 0, allReal = true;
  for (const e of entries) {
    if (e.type === 'gate') {
      const role = normalizeRole(e.gate, e.invocation);
      out.gates[role] = out.gates[role] || { count: 0, pass: 0, fail: 0 };
      if (e.shadow === true) {
        out.gates[role].shadow = (out.gates[role].shadow || 0) + 1;
      } else {
        out.gates[role].count++;
        if (e.result === 'pass') out.gates[role].pass++;
        if (e.result === 'fail') out.gates[role].fail++;
      }
      const drift = e.files?.files_drift || [];
      if (drift.length) out.drift.units_with_drift++;
      out.drift.files_added += drift.filter((d) => String(d).startsWith('+')).length;
      out.drift.files_removed += drift.filter((d) => String(d).startsWith('-')).length;
      if (e.usage?.cost_usd != null) { cost += e.usage.cost_usd; costGates++; if (e.usage.basis !== 'real') allReal = false; }
    }
    if (e.type === 'reviewer-comment') {
      if (e.verdict === 'real') out.reviewer_comments.real++;
      if (e.verdict === 'false-positive') out.reviewer_comments.false_positive++;
    }
    if (e.type === 'progress' && e.status) out.duration_ms = e.run_duration_ms ?? out.duration_ms;
  }
  if (costGates) out.cost = { total_usd: Math.round(cost * 100) / 100, gates_counted: costGates, basis: allReal ? 'real' : 'floor' };
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, path, ...rest] = process.argv.slice(2);
  if (!cmd || !path) {
    process.stderr.write('usage: node ledger.mjs validate|render|stats <ledger.jsonl> [--closed]\n' +
      '       node ledger.mjs cost <transcript.jsonl> --since <iso> [--until <iso>]\n');
    process.exit(1);
  }
  const text = readFileSync(path, 'utf8');
  if (cmd === 'validate') {
    const { errors, warnings } = validate(text, { closed: rest[0] === '--closed' });
    for (const w of warnings) process.stdout.write(`WARN  L${w.line} ${w.kind}: ${w.detail}\n`);
    for (const e of errors) process.stdout.write(`ERROR L${e.line} ${e.kind}: ${e.detail}\n`);
    process.stdout.write(`${errors.length} error(s), ${warnings.length} warning(s)\n`);
    process.exit(errors.length ? 1 : 0);
  } else if (cmd === 'render') {
    process.stdout.write(render(text) + '\n');
  } else if (cmd === 'stats') {
    process.stdout.write(JSON.stringify(stats(text), null, 2) + '\n');
  } else if (cmd === 'cost') {
    const flag = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
    const pricing = embeddedPricing();
    if (!pricing) {
      process.stderr.write('no embedded pricing — run the family-rendered ledger.mjs, not the raw template\n');
      process.exit(1);
    }
    process.stdout.write(JSON.stringify(transcriptCost(text, { since: flag('--since'), until: flag('--until'), pricing })) + '\n');
  } else {
    process.stderr.write(`unknown command: ${cmd}\n`);
    process.exit(1);
  }
}
