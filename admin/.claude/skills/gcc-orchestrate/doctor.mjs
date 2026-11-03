// doctor.mjs — setup preflight for the orchestration family.
//
// Verifies every prerequisite the run will assume: config slots, gate skills
// actually installed (project / user / plugin cache), family self-integrity,
// CLIs on PATH, gh auth. Run it BEFORE Phase 0 work; a critical ✗ means STOP —
// tell the user what to install; never improvise a substitute skill.
// (Motivating failure: a run whose assumptions broke mid-flight degraded
// silently instead of stopping.)
//
// Usage:
//   node doctor.mjs [<config.json>] [--json]     # default: .claude/skills/orchestrate.config.json
//
// Exit 0 = all critical checks pass. Exit 1 = at least one critical ✗.
// Levels: critical (STOP on fail) · advisory (warn, continue) · manual
// (not script-checkable — e.g. MCP reachability; confirm in-session).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';

const strip = (s) => (s || '').replace(/^\//, '').split(':').pop();

// Search order mirrors how the host resolves slash-invocables: project → user →
// plugins; a name can be provided by a skill dir (skills/<n>/SKILL.md) OR a
// command file (commands/<n>.md) — both are installed.
export function skillRoots(repoRoot, home) {
  const roots = [join(repoRoot, '.claude'), join(home, '.claude')];
  const cache = join(home, '.claude', 'plugins', 'cache');
  const dirs = (p) => { try { return readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(p, e.name)); } catch { return []; } };
  for (const marketplace of dirs(cache))
    for (const plugin of dirs(marketplace)) {
      if (existsSync(join(plugin, 'skills')) || existsSync(join(plugin, 'commands'))) roots.push(plugin); // unversioned layout
      for (const version of dirs(plugin))
        if (existsSync(join(version, 'skills')) || existsSync(join(version, 'commands'))) roots.push(version);
    }
  return roots;
}

export function resolveSkill(name, roots) {
  const n = strip(name);
  if (!n) return null;
  for (const root of roots) {
    if (existsSync(join(root, 'skills', n, 'SKILL.md'))) return join(root, 'skills', n);
    if (existsSync(join(root, 'commands', `${n}.md`))) return join(root, 'commands', `${n}.md`);
  }
  return null;
}

const defaultExecProbe = (cmd, args) => {
  try { return spawnSync(cmd, args, { stdio: 'ignore', timeout: 10_000 }).status === 0; }
  catch { return false; }
};
const onPath = (tool, execProbe) => execProbe('sh', ['-c', `command -v ${tool}`]);

export function runDoctor(cfgPath, { repoRoot = process.cwd(), home = homedir(), execProbe = defaultExecProbe } = {}) {
  const checks = [];
  const add = (level, name, ok, detail) => checks.push({ level, name, ok, detail });

  let cfg;
  try {
    cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    add('critical', 'config-parse', true, cfgPath);
  } catch (e) {
    add('critical', 'config-parse', false, `${cfgPath}: ${e.message}`);
    return checks; // nothing else is checkable without config
  }

  for (const slot of ['project.skill_prefix', 'vcs.default_branch', 'paths.plans_dir', 'paths.run_dir_fmt',
    'gates.implement.skill', 'gates.verify.skill', 'gates.review.skill']) {
    const v = slot.split('.').reduce((o, k) => (o == null ? undefined : o[k]), cfg);
    add('critical', `config-slot:${slot}`, v !== undefined && v !== null && v !== '', String(v ?? 'MISSING'));
  }

  // v2.4 slots — advisory: a pre-v2.4 family works without them, but regenerate to get
  // the pattern library and real cost tracking.
  add('advisory', 'config-slot:paths.patterns', !!cfg.paths?.patterns,
    cfg.paths?.patterns || 'MISSING — regenerate the family via /orchestrator-builder (v2.4)');
  add('advisory', 'config-slot:cost.track', cfg.cost?.track === true,
    cfg.cost?.track === true ? 'true' : 'not enabled — scorecard cost column stays empty');

  const prefix = cfg.project?.skill_prefix;
  const roots = skillRoots(repoRoot, home);
  const publishOn = cfg.publish?.target && cfg.publish.target !== 'none';

  // skill → criticality. Gate skills + the family the orchestrator dispatches are
  // critical; skills with graceful fallbacks are advisory.
  const wanted = new Map();
  const want = (name, level) => { const n = strip(name); if (n && !wanted.has(n)) wanted.set(n, level); };
  want(cfg.gates?.implement?.skill, 'critical');
  want(cfg.gates?.simplify?.skill, 'critical'); // optional gate, but configured ⇒ expected
  want(cfg.gates?.verify?.skill, 'critical');
  want(cfg.gates?.review?.skill, 'critical');
  for (const role of ['orchestrate', 'verify', 'review', 'pr', 'collision']) want(`${prefix}-${role}`, 'critical');
  want(`${prefix}-publish`, publishOn ? 'critical' : null);
  want(`${prefix}-compound`, 'advisory');
  want(`${prefix}-doctor`, 'advisory');
  want(cfg.learn?.skill, 'advisory');
  want(cfg.pr?.comment_puller, 'advisory');
  if (cfg.ticket?.workflow_skill) want(cfg.ticket.workflow_skill, 'advisory');
  for (const [name, level] of wanted) {
    if (!level) continue;
    const at = resolveSkill(name, roots);
    add(level, `skill:${name}`, !!at, at || 'NOT FOUND in project/user/plugin skills');
  }

  // family self-integrity: the machinery the skills shell out to
  const orchestrateDir = resolveSkill(`${prefix}-orchestrate`, roots);
  for (const file of ['ledger.mjs', 'doctor.mjs', 'patterns.mjs'])
    add('critical', `file:${prefix}-orchestrate/${file}`,
      !!orchestrateDir && existsSync(join(orchestrateDir, file)), orchestrateDir ? join(orchestrateDir, file) : 'skill dir not found');
  const verifyDir = resolveSkill(`${prefix}-verify`, roots);
  if (verifyDir)
    add('critical', `file:${prefix}-verify/verify.mjs`, existsSync(join(verifyDir, 'verify.mjs')), join(verifyDir, 'verify.mjs'));

  // CLIs + auth
  if (cfg.pr?.tool) {
    const ok = onPath(cfg.pr.tool, execProbe);
    add('critical', `cli:${cfg.pr.tool}`, ok, ok ? 'on PATH' : 'not on PATH');
    if (ok && cfg.pr.tool === 'gh')
      add('critical', 'auth:gh', execProbe('gh', ['auth', 'status']), 'gh auth status');
  }
  if (cfg.ticket?.system && cfg.ticket.system !== 'none' && cfg.ticket.cli)
    add('advisory', `cli:${cfg.ticket.cli}`, onPath(cfg.ticket.cli, execProbe),
      'ticket CLI (collision/transitions degrade gracefully without it)');

  if (publishOn)
    add('manual', `mcp:${cfg.publish.mcp_call}`, null,
      `confirm the ${cfg.publish.target} MCP tool is invocable in this session before Phase 3 publish`);

  return checks;
}

export function renderChecks(checks) {
  const mark = (c) => (c.ok === null ? '○' : c.ok ? '✓' : c.level === 'critical' ? '✗' : '!');
  const lines = checks.map((c) => `${mark(c)} ${c.level.padEnd(8)} ${c.name.padEnd(38)} ${c.detail}`);
  const failed = checks.filter((c) => c.level === 'critical' && c.ok === false);
  lines.push(failed.length
    ? `DOCTOR: FAIL — ${failed.length} critical prerequisite(s) missing. STOP: install them; never improvise a substitute.`
    : 'DOCTOR: PASS — all critical prerequisites present.');
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const cfgPath = args.filter((a) => a !== '--json')[0] || join('.claude', 'skills', 'orchestrate.config.json');
  const checks = runDoctor(cfgPath);
  if (json) process.stdout.write(JSON.stringify(checks, null, 2) + '\n');
  else process.stdout.write(renderChecks(checks) + '\n');
  process.exit(checks.some((c) => c.level === 'critical' && c.ok === false) ? 1 : 0);
}
