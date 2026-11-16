import test from "node:test";
import assert from "node:assert/strict";
import { assertDatabaseCommand, databaseTarget } from "./database-environment";

test("production deploy/build/start require main, including detached or missing Git, but diagnosis stays read-only on working branches", () => {
  for (const branch of ["staging_v1", "staging_v4", "codex/flota", null]) {
    for (const command of ["deploy", "build", "start"] as const) assert.throws(() => assertDatabaseCommand("production", command, branch), /main/);
    for (const command of ["check", "status"] as const) assert.doesNotThrow(() => assertDatabaseCommand("production", command, branch));
    assert.doesNotThrow(() => assertDatabaseCommand("development", "deploy", branch));
  }
  assert.doesNotThrow(() => assertDatabaseCommand("production", "deploy", "main"));
});
test("displayed connection target never includes user, password or query secrets", () => {
  const target = databaseTarget("postgresql://user:private@127.0.0.1:5434/liteerp4?schema=public&password=secret");
  assert.deepEqual(target, { host: "127.0.0.1", port: "5434", database: "liteerp4", schema: "public" });
  assert.throws(() => databaseTarget("https://host/database"));
});
