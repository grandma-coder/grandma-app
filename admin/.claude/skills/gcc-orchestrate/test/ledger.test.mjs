// ledger.test.mjs — run: node --test
// Failure cases mirror real drift observed in field ledgers (4 runs → 4
// taxonomies; 3 of 4 never closed): gate names in `type`, missing terminal
// close, partition breaks, review entries with no report.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate, render, stats, parse } from '../ledger.mjs';

const clean = readFileSync(new URL('./fixtures/sample-ledger.jsonl', import.meta.url), 'utf8');
const lines = clean.trim().split('\n');
const drop = (pred) => lines.filter((l) => !pred(JSON.parse(l))).join('\n');
const map = (fn) => lines.map((l) => JSON.stringify(fn(JSON.parse(l)))).join('\n');

test('clean closed fixture validates with zero errors', () => {
  const { errors, warnings } = validate(clean, { closed: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('gate name used as type (field drift, DEG-1237 style) is an error', () => {
  const drifted = map((e) => (e.type === 'gate' && e.gate === 'verify' ? { ...e, type: 'degen-verify' } : e));
  const { errors } = validate(drifted);
  assert.ok(errors.some((e) => e.kind === 'unknown-type' && /degen-verify/.test(e.detail)));
});

test('skill name in gate role field is an error', () => {
  const drifted = map((e) => (e.type === 'gate' && e.gate === 'verify' ? { ...e, gate: 'degen-verify' } : e));
  const { errors } = validate(drifted);
  assert.ok(errors.some((e) => e.kind === 'bad-role'));
});

test('missing terminal close fails only under --closed (3 of 4 field runs)', () => {
  const open = drop((e) => e.type === 'progress' && e.status);
  assert.equal(validate(open).errors.length, 0);
  const { errors } = validate(open, { closed: true });
  assert.ok(errors.some((e) => e.kind === 'not-closed'));
});

test('progress partition must equal roster', () => {
  const broken = map((e) =>
    e.type === 'progress' && !e.status ? { ...e, pending: [] } : e);
  const { errors } = validate(broken);
  assert.ok(errors.some((e) => e.kind === 'partition'));
});

test('review gate without report is an error', () => {
  const broken = map((e) => {
    if (e.type === 'gate' && e.gate === 'review' && e.unit === 'U1') { const { report, ...rest } = e; return rest; }
    return e;
  });
  const { errors } = validate(broken);
  assert.ok(errors.some((e) => e.kind === 'missing-report'));
});

test('verify gate without checks[] is an error', () => {
  const broken = map((e) => {
    if (e.type === 'gate' && e.gate === 'verify' && e.unit === 'U1') { const { checks, ...rest } = e; return rest; }
    return e;
  });
  const { errors } = validate(broken);
  assert.ok(errors.some((e) => e.kind === 'missing-checks'));
});

test('no run-header first line halts validation', () => {
  const { errors } = validate(lines.slice(1).join('\n'));
  assert.ok(errors.some((e) => e.kind === 'no-header'));
});

test('header invariants: total_units and wave union', () => {
  const broken = map((e) => (e.type === 'run-header' ? { ...e, total_units: 5 } : e));
  assert.ok(validate(broken).errors.some((e) => e.kind === 'header-invariant'));
});

test('entries after terminal close are an error', () => {
  const after = clean.trim() + '\n' + JSON.stringify({ type: 'decision', claim: 'late', rationale: 'x' });
  const { errors } = validate(after);
  assert.ok(errors.some((e) => e.kind === 'entries-after-close'));
});

test('bad json line reported with line number, rest still parses', () => {
  const mangled = lines.slice(0, 3).join('\n') + '\nnot json\n' + lines.slice(3).join('\n');
  const { errors, entries } = parse(mangled);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 4);
  assert.equal(entries.length, lines.length);
});

test('missing timing is a warning, not an error', () => {
  const noTiming = map((e) => { const { timing, ...rest } = e; return rest; });
  const { errors, warnings } = validate(noTiming, { closed: true });
  assert.equal(errors.length, 0);
  assert.ok(warnings.some((w) => w.kind === 'no-timing'));
});

test('render produces a unit-status table classified from gates', () => {
  const md = render(clean);
  assert.ok(md.includes('| U1 | Add widget endpoint | done | abc123def | pass | pass |'));
  assert.ok(md.includes('| U2 | Wire widget into dashboard | done |'));
});

test('render classifies unit without verify pass as pending', () => {
  const noVerify = drop((e) => e.type === 'gate' && e.gate === 'verify' && e.unit === 'U2');
  assert.ok(render(noVerify).includes('| U2 | Wire widget into dashboard | pending |'));
});

test('stats aggregates catch-rate, drift, gates, cost', () => {
  const s = stats(clean);
  assert.equal(s.units.done, 2);
  assert.deepEqual(s.reviewer_comments, { real: 1, false_positive: 1 });
  assert.equal(s.gates.review.count, 2);
  assert.equal(s.drift.units_with_drift, 1);
  assert.equal(s.drift.files_added, 1);
  assert.equal(s.cost.total_usd, 1.35);
  assert.equal(s.cost.basis, 'floor');
  assert.equal(s.duration_ms, 7200000);
});

const shadowGate = JSON.stringify({
  type: 'gate', unit: 'U1', gate: 'review', shadow: true,
  invocation: '/degen-review U1', result: 'advisory', ts: '2026-07-06T11:00:00Z',
  report: 'RUN_DIR/reports/review-U1-shadow.md',
  checks: [{ finding: 'unused import', verdict: 'real' }],
  provenance: { model: 'haiku', session: 's2' },
  timing: { started_at: '2026-07-06T11:00:00Z', ended_at: '2026-07-06T11:03:00Z', duration_ms: 180000 },
  usage: { cost_usd: 0.4, basis: 'real' },
});
// insert the shadow entry BEFORE the terminal close (last line)
const withShadow = [...lines.slice(0, -1), shadowGate, lines[lines.length - 1]].join('\n');

test('shadow gate validates clean and does not affect close', () => {
  const { errors } = validate(withShadow, { closed: true });
  assert.deepEqual(errors, []);
});

test('shadow gate without provenance.model is an error', () => {
  const bare = JSON.parse(shadowGate); delete bare.provenance;
  const broken = [...lines.slice(0, -1), JSON.stringify(bare), lines[lines.length - 1]].join('\n');
  assert.ok(validate(broken).errors.some((e) => e.kind === 'shadow-no-model'));
});

test('shadow gates never drive unit state', () => {
  // U2 with ONLY a shadow verify must stay pending
  const noVerify = drop((e) => e.type === 'gate' && e.gate === 'verify' && e.unit === 'U2');
  const sv = JSON.parse(shadowGate); sv.unit = 'U2'; sv.gate = 'verify'; sv.result = 'pass'; delete sv.report;
  const txt = noVerify + '\n' + JSON.stringify(sv);
  assert.ok(render(txt).includes('| U2 | Wire widget into dashboard | pending |'));
});

test('stats counts shadow gates separately, includes their cost', () => {
  const s = stats(withShadow);
  assert.equal(s.gates.review.count, 2);        // real reviews unchanged
  assert.equal(s.gates.review.shadow, 1);
  assert.equal(s.cost.total_usd, 1.75);          // 1.35 fixture + 0.4 shadow
});

test('skipped review gate needs neither report nor checks (PR-1432 #2)', () => {
  const skipped = JSON.stringify({
    type: 'gate', unit: 'U1', gate: 'review', shadow: true, result: 'skipped',
    invocation: '/degen-review U1', ts: '2026-07-06T11:00:00Z', raw: 'probe timed out',
    provenance: { model: 'haiku', session: 's2' },
  });
  const txt = [...lines.slice(0, -1), skipped, lines[lines.length - 1]].join('\n');
  const { errors } = validate(txt, { closed: true });
  assert.deepEqual(errors, []);
});

test('non-skipped review gate still requires report and checks', () => {
  const broken = map((e) => {
    if (e.type === 'gate' && e.gate === 'review' && e.unit === 'U1') { const { report, checks, ...rest } = e; return rest; }
    return e;
  });
  const { errors } = validate(broken);
  assert.ok(errors.some((e) => e.kind === 'missing-report'));
  assert.ok(errors.some((e) => e.kind === 'missing-checks'));
});
