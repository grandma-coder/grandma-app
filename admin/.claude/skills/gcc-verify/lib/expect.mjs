export function parseExpect(raw) {
  const s = String(raw).trim();
  const exitMatch = s.match(/^exit\s+(\d+)$/);
  if (exitMatch) return { type: "exit", code: Number(exitMatch[1]) };
  if (s.startsWith("contains:")) return { type: "contains", value: s.slice("contains:".length).trim() };
  return { type: "literal", value: s };
}

export function evaluateExpect(spec, { stdout, code }) {
  switch (spec.type) {
    case "exit": return code === spec.code;
    case "contains": return String(stdout).includes(spec.value);
    case "literal": return String(stdout).trim() === spec.value;
    default: return false;
  }
}
