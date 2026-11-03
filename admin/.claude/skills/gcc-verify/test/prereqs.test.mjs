import { test } from "node:test";
import assert from "node:assert/strict";
import { missingPrereqs } from "../lib/prereqs.mjs";

test("missingPrereqs consults the injected ports table", async () => {
  const ports = { engine: 3001, inngest: 8288 };
  // probe stub: engine open, inngest closed
  const probe = async (port) => port === 3001;
  const missing = await missingPrereqs(["engine", "inngest"], { probe, ports });
  assert.deepEqual(missing, ["inngest"]);
});

test("unknown token is treated as missing", async () => {
  const probe = async () => true;
  const missing = await missingPrereqs(["bogus"], { probe, ports: {} });
  assert.deepEqual(missing, ["bogus"]);
});

test("empty needs → nothing missing", async () => {
  const missing = await missingPrereqs([], { probe: async () => false });
  assert.deepEqual(missing, []);
});
