import assert from "node:assert/strict";
import { test } from "node:test";
import { columnFilterOperators, compileColumnFilter } from "@/lib/list/filters";

test("relation filters offer identity and emptiness instead of text comparisons", () => {
  assert.deepEqual(columnFilterOperators("text", true), ["eq", "neq", "empty", "notEmpty"]);
  assert.ok(columnFilterOperators("text").includes("contains"));
  const filter = { field: "modeloId", operator: "eq" as const, value: "model-1" };
  const restored = JSON.parse(JSON.stringify(filter));
  assert.deepEqual(compileColumnFilter("text", restored), { modeloId: { equals: "model-1", mode: "insensitive" } });
  assert.deepEqual(compileColumnFilter("text", { ...filter, operator: "neq" }), { modeloId: { not: "model-1", mode: "insensitive" } });
  assert.deepEqual(compileColumnFilter("text", { field: "modeloId", operator: "empty" }, true), { OR: [{ modeloId: null }, { modeloId: "" }] });
});
