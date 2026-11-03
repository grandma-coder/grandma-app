// ledger-cost.test.mjs — run: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transcriptCost, embeddedPricing } from '../ledger.mjs';

const transcript = readFileSync(new URL('./fixtures/sample-transcript.jsonl', import.meta.url), 'utf8');
const pricing = {
  opus: { input: 5, output: 25 }, sonnet: { input: 3, output: 15 },
  haiku: { input: 1, output: 5 }, fable: { input: 10, output: 50 },
};

test('prices a window: cache_creation ×1.25, cache_read ×0.1', () => {
  const c = transcriptCost(transcript, { since: '2026-07-06T10:00:00Z', until: '2026-07-06T10:10:00Z', pricing });
  // opus msg only: in-equiv = 1000 + 1.25*4000 + 0.1*10000 = 7000 → (7000*5 + 2000*25)/1e6 = 0.085
  assert.equal(c.cost_usd, 0.085);
  assert.equal(c.tokens_in, 15000);   // raw sum: 1000 + 10000 + 4000
  assert.equal(c.tokens_out, 2000);
  assert.equal(c.basis, 'real');
  assert.deepEqual(c.models, ['opus']);
});

test('window excludes messages outside since/until', () => {
  const c = transcriptCost(transcript, { since: '2026-07-06T10:00:00Z', until: '2026-07-06T11:00:00Z', pricing });
  assert.deepEqual(c.models.sort(), ['haiku', 'opus']); // the 12:00 opus msg excluded
});

test('unknown model degrades basis to floor, still counts tokens', () => {
  const c = transcriptCost(transcript, { pricing }); // whole file, includes unknown-model line
  assert.equal(c.basis, 'floor');
  assert.ok(c.tokens_in > 15000);
});

test('embeddedPricing: null in the raw template, a full table when rendered', () => {
  // This test ships into generated families, where the pricing IS embedded —
  // assert whichever context we're in is internally consistent, never throw.
  const p = embeddedPricing();
  if (p === null) return; // builder-root raw template
  for (const alias of ['opus', 'sonnet', 'haiku', 'fable'])
    assert.ok(p[alias].input > 0 && p[alias].output > 0, `pricing.${alias}`);
});

test('window matching zero messages is floor, not measured-zero real', () => {
  const c = transcriptCost(transcript, { since: '2027-01-01T00:00:00Z', pricing });
  assert.equal(c.tokens_in, 0);
  assert.equal(c.basis, 'floor');
});

test('invalid --since/--until throws instead of silently including everything (PR-1432 #3)', () => {
  assert.throws(() => transcriptCost(transcript, { since: 'not-a-date', pricing }), RangeError);
  assert.throws(() => transcriptCost(transcript, { until: '2026-13-99', pricing }), RangeError);
});

test('non-string model field does not throw (PR-1432 #4)', () => {
  const weird = JSON.stringify({ type: 'assistant', timestamp: '2026-07-06T10:05:00Z', message: { model: 42, usage: { input_tokens: 10, output_tokens: 10 } } });
  const c = transcriptCost(transcript + '\n' + weird, { pricing });
  assert.equal(c.basis, 'floor'); // unpriceable, but no crash
});
