// patterns.test.mjs — run: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse, match, lint, renderActive, globToRegex, ACTIVE_CAP } from '../patterns.mjs';

const fixture = readFileSync(new URL('./fixtures/sample-patterns.md', import.meta.url), 'utf8');

test('parse extracts id, slug, status, fields', () => {
  const { patterns, malformed } = parse(fixture);
  assert.equal(patterns.length, 3);
  assert.deepEqual(malformed, []);
  const p = patterns[0];
  assert.equal(p.id, 'P-001');
  assert.equal(p.slug, 'zod-parse-api-body');
  assert.equal(p.status, 'active');
  assert.equal(p.rule, 'API route handlers must zod-parse request body before use.');
  assert.equal(p.scope, 'apps/*/api/**');
  assert.equal(p.added, '2026-07-06');
  assert.equal(p.last_hit, '2026-07-06');
});

test('parse flags malformed block headers, keeps parsing the rest', () => {
  const { patterns, malformed } = parse(fixture + '\n## broken header no id\nRule: x\n');
  assert.equal(patterns.length, 3);
  assert.equal(malformed.length, 1);
});

test('glob: * does not cross /, ** does, **/ optional prefix', () => {
  assert.ok(globToRegex('apps/*/api/**').test('apps/web/api/users/route.ts'));
  assert.ok(!globToRegex('apps/*/api/**').test('apps/web/lib/api.ts'));
  assert.ok(!globToRegex('apps/*').test('apps/web/page.ts'));
  assert.ok(globToRegex('**/verify.mjs').test('verify.mjs'));
  assert.ok(globToRegex('**/verify.mjs').test('deep/nested/verify.mjs'));
});

test('match returns active patterns whose scope hits any file; retired excluded', () => {
  const { patterns } = parse(fixture);
  const hit = match(patterns, ['apps/web/api/users/route.ts']);
  assert.deepEqual(hit.map((p) => p.id), ['P-001', 'P-003']); // P-003 via apps/**/*.ts
  assert.deepEqual(match(patterns, ['scripts/verify.mjs']).map((p) => p.id), []); // P-002 retired
});

test('match handles comma-separated multi-glob scope', () => {
  const { patterns } = parse(fixture);
  assert.deepEqual(match(patterns, ['packages/db/client.sql']).map((p) => p.id), ['P-003']);
});

test('renderActive: one line per pattern, id + rule + scope', () => {
  const { patterns } = parse(fixture);
  const out = renderActive(patterns, ['apps/web/api/x.ts']);
  assert.ok(out.includes('- P-001: API route handlers must zod-parse request body before use. [apps/*/api/**]'));
  assert.ok(!out.includes('P-002'));
});

test('lint: clean fixture has zero issues', () => {
  assert.deepEqual(lint(fixture), []);
});

test('lint: duplicate id, missing field, over-cap', () => {
  const dup = fixture + '\n## P-001 · again [active]\nRule: r\nScope: a/**\nAdded: 2026-07-06\n';
  assert.ok(lint(dup).some((i) => i.kind === 'duplicate-id'));
  const noScope = fixture + '\n## P-009 · no-scope [active]\nRule: r\nAdded: 2026-07-06\n';
  assert.ok(lint(noScope).some((i) => i.kind === 'missing-field'));
  const many = fixture + Array.from({ length: ACTIVE_CAP }, (_, i) =>
    `\n## P-${100 + i} · filler-${i} [active]\nRule: r${i}\nScope: a/**\nAdded: 2026-07-06\n`).join('');
  assert.ok(lint(many).some((i) => i.kind === 'over-cap'));
});

test('CLI: lint on a missing file exits 1; match stays silent-empty', () => {
  const cli = fileURLToPath(new URL('../patterns.mjs', import.meta.url));
  const lintRun = spawnSync(process.execPath, [cli, 'lint', '/nonexistent/patterns.md']);
  assert.equal(lintRun.status, 1);
  assert.ok(lintRun.stderr.toString().includes('cannot read'));
  const matchRun = spawnSync(process.execPath, [cli, 'match', '/nonexistent/patterns.md', 'a.ts']);
  assert.equal(matchRun.status, 0);
  assert.equal(matchRun.stdout.toString(), '');
});
