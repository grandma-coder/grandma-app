import net from "node:net";

// Stack service ports come from the project's config (build.stack_ports) at
// generation time — never hardcoded here. Pre-render (template repo) the token
// below is a literal string, so PORTS safely falls back to {}. Callers and
// tests can inject their own table via the `ports` option.
const RAW_PORTS = '{}';
export const PORTS = (() => { try { return JSON.parse(RAW_PORTS); } catch { return {}; } })();

export function tcpProbe(port, { timeoutMs = 400 } = {}) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

export async function missingPrereqs(needs, { probe = tcpProbe, ports = PORTS } = {}) {
  const missing = [];
  for (const token of needs) {
    const port = ports[token];
    if (port === undefined) { missing.push(token); continue; }
    const ok = await probe(port);
    if (!ok) missing.push(token);
  }
  return missing;
}
