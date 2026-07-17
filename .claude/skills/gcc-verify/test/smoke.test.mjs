import { test } from "node:test";
import assert from "node:assert/strict";
import { hello } from "../verify.mjs";

test("module loads", () => {
  assert.equal(hello(), "gcc-verify");
});
