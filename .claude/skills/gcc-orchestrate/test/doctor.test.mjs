// doctor.test.mjs — run: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDoctor, resolveSkill, skillRoots, renderChecks } from '../doctor.mjs';

// Build a fake host: repo skills, user skills, plugin cache (versioned + not).
function makeHost() {
  const repo = mkdtempSync(join(tmpdir(), 'doc-repo-'));
  const home = mkdtempSync(join(tmpdir(), 'doc-home-'));
  const skill = (base, name, files = []) => {
    mkdirSync(join(base, name), { recursive: true });
    writeFileSync(join(base, name, 'SKILL.md'), `---\nname: ${name}\ndescription: x\n---\n`);
    for (const f of files) writeFileSync(join(base, name, f), '// stub');
  };
  const repoSkills = join(repo, '.claude', 'skills');
  skill(repoSkills, 'proj-orchestrate', ['ledger.mjs', 'doctor.mjs', 'patterns.mjs']);
  skill(repoSkills, 'proj-verify', ['verify.mjs']);
  skill(repoSkills, 'proj-review');
  skill(repoSkills, 'proj-pr');
  skill(repoSkills, 'proj-collision');
  skill(repoSkills, 'proj-compound');
  skill(join(home, '.claude', 'skills'), 'user-skill');
  skill(join(home, '.claude', 'plugins', 'cache', 'mkt', 'ce', '1.0.0', 'skills'), 'ce-work');
  // slash COMMANDS are installed too — project commands/<n>.md + plugin commands
  mkdirSync(join(repo, '.claude', 'commands'), { recursive: true });
  writeFileSync(join(repo, '.claude', 'commands', 'pull-pr-comments.md'), '# cmd');
  mkdirSync(join(home, '.claude', 'plugins', 'cache', 'mkt', 'flat', 'commands'), { recursive: true });
  writeFileSync(join(home, '.claude', 'plugins', 'cache', 'mkt', 'flat', 'commands', 'plugin-cmd.md'), '# cmd');
  return { repo, home, repoSkills };
}

const CFG = {
  project: { skill_prefix: 'proj' },
  vcs: { default_branch: 'main' },
  paths: { plans_dir: 'docs/plans', run_dir_fmt: 'docs/plans/orchestration-<slug>-<date>' },
  gates: {
    implement: { skill: '/ce-work' },
    verify: { skill: '/proj-verify' },
    review: { skill: '/proj-review' },
  },
  pr: { tool: 'gh', comment_puller: '/pull-pr-comments' },
  ticket: { system: 'none', cli: '' },
  publish: { target: 'none' },
  learn: { skill: '/ghost-compound' },
};

function writeCfg(repo, cfg = CFG) {
  const p = join(repo, 'config.json');
  writeFileSync(p, JSON.stringify(cfg));
  return p;
}

const allOk = () => true;

test('resolveSkill finds skills across project, user, and both plugin layouts', () => {
  const { repo, home } = makeHost();
  const roots = skillRoots(repo, home);
  assert.ok(resolveSkill('/proj-verify', roots));
  assert.ok(resolveSkill('user-skill', roots));
  assert.ok(resolveSkill('/ce-work', roots), 'versioned plugin layout');
  assert.ok(resolveSkill('/pull-pr-comments', roots), 'project command file counts as installed');
  assert.ok(resolveSkill('plugin-cmd', roots), 'plugin command file counts as installed');
  assert.ok(resolveSkill('superpowers:user-skill', roots), 'namespaced form resolves by tail');
  assert.equal(resolveSkill('/nope', roots), null);
});

test('healthy host: doctor passes with zero critical failures', () => {
  const { repo, home } = makeHost();
  const checks = runDoctor(writeCfg(repo), { repoRoot: repo, home, execProbe: allOk });
  const crit = checks.filter((c) => c.level === 'critical' && c.ok === false);
  assert.deepEqual(crit, []);
  // advisory ghost skill flagged but not critical
  const ghost = checks.find((c) => c.name === 'skill:ghost-compound');
  assert.equal(ghost.level, 'advisory');
  assert.equal(ghost.ok, false);
  assert.match(renderChecks(checks), /DOCTOR: PASS/);
});

test('configured simplify gate must resolve; unconfigured is not demanded', () => {
  const { repo, home } = makeHost();
  const cfg = structuredClone(CFG);
  cfg.gates.simplify = { skill: '/ponytail-review' };
  const checks = runDoctor(writeCfg(repo, cfg), { repoRoot: repo, home, execProbe: allOk });
  const c = checks.find((x) => x.name === 'skill:ponytail-review');
  assert.equal(c.level, 'critical');
  assert.equal(c.ok, false);
  const none = runDoctor(writeCfg(repo), { repoRoot: repo, home, execProbe: allOk });
  assert.ok(!none.some((x) => x.name.startsWith('skill:ponytail')));
});

test('missing gate skill is a critical failure → FAIL verdict', () => {
  const { repo, home } = makeHost();
  const cfg = structuredClone(CFG);
  cfg.gates.review.skill = '/not-installed-review';
  const checks = runDoctor(writeCfg(repo, cfg), { repoRoot: repo, home, execProbe: allOk });
  const bad = checks.find((c) => c.name === 'skill:not-installed-review');
  assert.equal(bad.level, 'critical');
  assert.equal(bad.ok, false);
  assert.match(renderChecks(checks), /DOCTOR: FAIL/);
});

test('gh missing from PATH and failed auth are critical', () => {
  const { repo, home } = makeHost();
  const noGh = (cmd, args) => !(args && args.join(' ').includes('gh'));
  const checks = runDoctor(writeCfg(repo), { repoRoot: repo, home, execProbe: noGh });
  assert.equal(checks.find((c) => c.name === 'cli:gh').ok, false);
  const authFails = (cmd) => cmd !== 'gh';
  const checks2 = runDoctor(writeCfg(repo), { repoRoot: repo, home, execProbe: authFails });
  assert.equal(checks2.find((c) => c.name === 'auth:gh').ok, false);
});

test('publish target none → no publish skill demanded, no manual MCP line', () => {
  const { repo, home } = makeHost();
  const checks = runDoctor(writeCfg(repo), { repoRoot: repo, home, execProbe: allOk });
  assert.ok(!checks.some((c) => c.name === 'skill:proj-publish'));
  assert.ok(!checks.some((c) => c.name.startsWith('mcp:')));
});

test('publish target set → publish skill critical + manual MCP check emitted', () => {
  const { repo, home, repoSkills } = makeHost();
  const cfg = structuredClone(CFG);
  cfg.publish = { target: 'skeleton', mcp_call: 'save_context' };
  const checks = runDoctor(writeCfg(repo, cfg), { repoRoot: repo, home, execProbe: allOk });
  const pub = checks.find((c) => c.name === 'skill:proj-publish');
  assert.equal(pub.level, 'critical');
  assert.equal(pub.ok, false); // makeHost does not create proj-publish
  const mcp = checks.find((c) => c.name === 'mcp:save_context');
  assert.equal(mcp.level, 'manual');
  assert.equal(mcp.ok, null);
});

test('unparseable config short-circuits to a single critical failure', () => {
  const { repo, home } = makeHost();
  const p = join(repo, 'broken.json');
  writeFileSync(p, '{nope');
  const checks = runDoctor(p, { repoRoot: repo, home, execProbe: allOk });
  assert.equal(checks.length, 1);
  assert.equal(checks[0].ok, false);
});

test('missing ledger.mjs in orchestrate dir is critical (self-integrity)', () => {
  const { repo, home } = makeHost();
  const bare = mkdtempSync(join(tmpdir(), 'doc-repo2-'));
  const skills = join(bare, '.claude', 'skills');
  for (const s of ['proj-orchestrate', 'proj-verify', 'proj-review', 'proj-pr', 'proj-collision']) {
    mkdirSync(join(skills, s), { recursive: true });
    writeFileSync(join(skills, s, 'SKILL.md'), '---\nname: x\ndescription: y\n---\n');
  }
  const checks = runDoctor(writeCfg(bare), { repoRoot: bare, home, execProbe: allOk });
  assert.equal(checks.find((c) => c.name === 'file:proj-orchestrate/ledger.mjs').ok, false);
});

test('patterns.mjs is family self-integrity (critical) and passes when present', () => {
  const { repo, home } = makeHost();
  const checks = runDoctor(writeCfg(repo), { repoRoot: repo, home, execProbe: allOk });
  const c = checks.find((x) => x.name === 'file:proj-orchestrate/patterns.mjs');
  assert.equal(c.level, 'critical');
  assert.equal(c.ok, true);
});

test('v2.4 slots present (paths.patterns + cost.track) → advisory checks pass', () => {
  const { repo, home } = makeHost();
  const cfg = structuredClone(CFG);
  cfg.paths.patterns = 'docs/patterns.md';
  cfg.cost = { track: true };
  const checks = runDoctor(writeCfg(repo, cfg), { repoRoot: repo, home, execProbe: allOk });
  const patterns = checks.find((x) => x.name === 'config-slot:paths.patterns');
  const cost = checks.find((x) => x.name === 'config-slot:cost.track');
  assert.equal(patterns.level, 'advisory');
  assert.equal(patterns.ok, true);
  assert.equal(cost.level, 'advisory');
  assert.equal(cost.ok, true);
});

test('v2.4 slots absent (pre-v2.4 family) → advisory checks fail but doctor still PASSes', () => {
  const { repo, home } = makeHost();
  const checks = runDoctor(writeCfg(repo), { repoRoot: repo, home, execProbe: allOk });
  const patterns = checks.find((x) => x.name === 'config-slot:paths.patterns');
  const cost = checks.find((x) => x.name === 'config-slot:cost.track');
  assert.equal(patterns.ok, false);
  assert.equal(cost.ok, false);
  assert.ok(!checks.some((x) => x.level === 'critical' && x.name === 'config-slot:paths.patterns'));
  assert.match(renderChecks(checks), /DOCTOR: PASS/);
});
