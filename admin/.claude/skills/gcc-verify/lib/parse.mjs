const HEADING_RE = /^#{2,3}\s+(.*\S)\s*$/;
const FENCE_OPEN_RE = /^```verify\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;

function stripQuotes(s) {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

// Split on commas that are NOT inside single/double quotes.
function splitArrayItems(inner) {
  const parts = [];
  let buf = "";
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
    } else if (ch === ",") {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  parts.push(buf);
  return parts;
}

function parseValue(raw) {
  const t = raw.trim();
  if (t.startsWith("[") && t.endsWith("]")) {
    const inner = t.slice(1, -1).trim();
    if (inner === "") return [];
    return splitArrayItems(inner).map((x) => stripQuotes(x));
  }
  return stripQuotes(t);
}

function splitKeyValue(line) {
  const i = line.indexOf(":");
  if (i === -1) return null;
  return [line.slice(0, i).trim(), line.slice(i + 1)];
}

// Parse one fenced block body (array-of-items restricted YAML) into raw objects.
export function parseBlockBody(body, step) {
  const items = [];
  let current = null;
  for (const rawLine of body.split("\n")) {
    if (rawLine.trim() === "") continue;
    const isItemStart = /^\s*-\s+/.test(rawLine);
    const content = isItemStart ? rawLine.replace(/^\s*-\s+/, "") : rawLine;
    if (isItemStart) {
      current = { step };
      items.push(current);
    }
    if (!current) continue;
    const kv = splitKeyValue(content);
    if (!kv) continue;
    const [key, value] = kv;
    current[key] = parseValue(value);
  }
  return items;
}

export function validate(item) {
  const step = item.step;
  const id = typeof item.id === "string" ? item.id : null;
  const err = (message) => ({ step, id, kind: "error", message });
  if (!id) return err("missing required field: id");
  if (item.kind === "assert") {
    if (typeof item.run !== "string") return err(`assert "${id}" missing required field: run`);
    if (typeof item.expect !== "string") return err(`assert "${id}" missing required field: expect`);
    return { step, id, kind: "assert", requirement: item.requirement ?? "",
      needs: Array.isArray(item.needs) ? item.needs : [], run: item.run, expect: item.expect };
  }
  if (item.kind === "judge") {
    if (typeof item.ask !== "string") return err(`judge "${id}" missing required field: ask`);
    if (!Array.isArray(item.evidence) || item.evidence.length === 0)
      return err(`judge "${id}" missing required field: evidence`);
    return { step, id, kind: "judge", requirement: item.requirement ?? "",
      ask: item.ask, evidence: item.evidence };
  }
  return err(`"${id}" has unknown kind: ${item.kind ?? "(none)"}`);
}

export function parsePlan(markdown) {
  const lines = markdown.split("\n");
  const checks = [];
  let step = "(no step)";
  let inBlock = false;
  let buf = [];
  for (const line of lines) {
    if (!inBlock) {
      const h = line.match(HEADING_RE);
      if (h) { step = h[1]; continue; }
      if (FENCE_OPEN_RE.test(line)) { inBlock = true; buf = []; continue; }
    } else {
      if (FENCE_CLOSE_RE.test(line)) {
        inBlock = false;
        for (const item of parseBlockBody(buf.join("\n"), step)) checks.push(validate(item));
        continue;
      }
      buf.push(line);
    }
  }
  if (inBlock) {
    checks.push({ step, id: null, kind: "error",
      message: "unterminated ```verify fence (missing closing ```); block dropped" });
  }
  return checks;
}
