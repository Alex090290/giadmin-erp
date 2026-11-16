import assert from "node:assert/strict";
import test from "node:test";
import { Fields, Model, defineModel, depends, onchange, type ReactionValues } from "./index";
import { createModelService } from "./service";
import { unboundRepository, type ModelRepository } from "./repository";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ListRecord, ListState } from "../list/types";
import { resolveCollectionComputed } from "./collection-computed";
import { generateModule } from "./generator/generate";

let calls = 0;
class Vehicle extends Model {
  name = Fields.Text({ required: true });
  current = Fields.Integer({ required: true });
  target = Fields.Integer({ required: true });
  state = Fields.Selection([{ value: "draft", label: "Borrador" }, { value: "done", label: "Hecho" }], { required: true });
  remaining = Fields.Integer({ compute: "calculate", required: true });
  summary = Fields.Text({ compute: "calculate", required: true });
  @depends("current", "target")
  calculate(values: ReactionValues) {
    calls++;
    assert.equal(Object.isFrozen(values), true);
    assert.deepEqual(Object.keys(values).sort(), ["current", "target"]);
    const remaining = Number(values.target) - Number(values.current);
    return { remaining, summary: `Faltan ${remaining}` };
  }
  @onchange({ fields: ["current"], writes: ["name"] })
  edit() { throw new Error("Must never run an onchange while listing"); }
  beforeSave(): never { throw new Error("Must never save while listing"); }
}
const model = defineModel(Vehicle, { name: "ComputeCollection", table: "compute_collection" });
type Values = { name: string; current: number; target: number; state: "draft" | "done" };
const policy = { fields: ["name", "current", "target", "state", "remaining"], searchFields: ["name"], sortable: ["name"], filterable: ["name"], groupable: ["state"] };
const actor = { id: "reader", sessionVersion: 1 };
const state: ListState = { query: "", page: 1, pageSize: 2, sort: "name", direction: "asc", filters: [] };
const rows: ListRecord[] = [{ id: "a", name: "A", current: 16000, target: 20000, state: "draft", private: "do not send" }, { id: "b", name: "B", current: 21000, target: 20000, state: "draft" }];
function fixture() {
  let reads = 0, counts = 0, authorized = true, readonly = false;
  const tx = { $executeRaw: async () => { readonly = true; } };
  const prisma = { $transaction: async (fn: (tx: unknown) => unknown, options: unknown) => { assert.deepEqual(options, { isolationLevel: "RepeatableRead" }); return fn(tx); } } as unknown as PrismaClient;
  const repository: ModelRepository<Values> = { ...unboundRepository<Values>(), count: async (_tx, where) => { counts++; assert.match(JSON.stringify(where), /owner/); return 10; }, list: async (transaction, query) => { assert.equal(transaction, tx); assert.equal(readonly, true); assert.equal(query.take, 2); reads++; return rows; }, groups: async () => [{ value: "draft", count: 10 }] };
  const service = createModelService(model, repository, { list: policy, kanban: { field: "state" }, authorize: async () => { if (!authorized) throw new Error("denied"); return { owner: actor.id }; } });
  return { service, prisma, repository, stats: () => ({ reads, counts }), deny: () => { authorized = false; } };
}

test("authorized collection page computes grouped methods once per row, in readonly snapshot, without N+1 repository reads", async () => {
  calls = 0;
  const f = fixture();
  const result = await f.service.list(f.prisma, actor, state);
  assert.ok(result.ok);
  assert.equal(result.data.rows[0].remaining, 4000);
  assert.equal(result.data.rows[1].remaining, -1000);
  assert.equal(result.data.rows[0].summary, undefined);
  assert.equal(result.data.rows[0].private, undefined);
  assert.equal(rows[0].remaining, undefined);
  assert.equal(calls, 2);
  assert.deepEqual(f.stats(), { reads: 1, counts: 1 });
  const kanban = await f.service.kanban(f.prisma, actor, { group: "draft", state });
  assert.ok(kanban.ok); assert.equal(kanban.data.rows[0].remaining, 4000);
  assert.equal(calls, 4); assert.deepEqual(f.stats(), { reads: 2, counts: 2 });
  const grouped = await f.service.list(f.prisma, actor, { ...state, groupBy: ["state"] });
  assert.ok(grouped.ok); assert.equal(calls, 4, "group headers have no records to compute");
  f.deny(); assert.equal((await f.service.list(f.prisma, actor, state)).ok, false);
  assert.equal(calls, 4, "denied actors never reach compute");
});

test("publication excludes unrequested virtuals and rejects hidden dependencies, SQL capabilities and fabricated queries", async () => {
  const f = fixture();
  for (const key of ["searchFields", "sortable", "filterable", "groupable"] as const) assert.throws(() => createModelService(model, f.repository, { list: { ...policy, [key]: ["remaining"] } }), /lectura/);
  assert.throws(() => createModelService(model, f.repository, { list: { ...policy, fields: ["name", "state", "remaining"] } }), /dependencias/);
  for (const input of [{ ...state, sort: "remaining" }, { ...state, groupBy: ["remaining"] }, { ...state, filters: [{ field: "remaining", operator: "gt", value: "0" }] }]) assert.equal((await f.service.list(f.prisma, actor, input)).ok, false);
  assert.deepEqual(f.stats(), { reads: 0, counts: 0 });
  calls = 0;
  const legacy = createModelService(model, { ...f.repository, count: async () => 0, list: async () => [] }, { authorize: async () => undefined, list: { ...policy, fields: policy.fields.filter(name => name !== "remaining") } });
  assert.equal((await legacy.list(f.prisma, actor, state)).ok, true); assert.equal(calls, 0);
  const files = generateModule({ id: "calc", depends: [], models: [{ model, clientFields: ["name", "current", "target", "state"] }] }, { schema: 'datasource db {\n provider = "postgresql"\n}\nmodel User {\n id String @id\n}', owners: {} });
  assert.match(files["ComputeCollection.schema.ts"], /CollectionFields[\s\S]*PreviewFields.remaining.metadata, readOnly: true/);
  assert.doesNotMatch(files["models.prisma"], /\bremaining\b/);
});

test("collection compute validates entire shared output and dependencies, isolates rows and honors context", async () => {
  class Invalid extends Vehicle { @depends("current", "target") calculate() { return { remaining: 2, summary: 123 } as never; } }
  const invalid = defineModel(Invalid, { name: "InvalidComputeCollection", table: "invalid_compute_collection" });
  await assert.rejects(invalid.computeCollection(["remaining"], rows[0], {} as never));
  await assert.rejects(model.computeCollection(["remaining"], { current: 1 }, {} as never), /dependencias/);
  await assert.rejects(model.computeCollection(["unpublished"], rows[0], {} as never), /no publicado/);
  const context = { tx: {}, actor } as never;
  const ids: string[] = [];
  const values = await resolveCollectionComputed(Array.from({ length: 205 }, (_, n) => ({ ...rows[0], id: String(n) })), ["remaining"], { computeCollection: async (names, _values, ctx) => { assert.deepEqual(names, ["remaining"]); assert.equal(ctx.actor.id, actor.id); ids.push(ctx.id!); return { remaining: 1 }; } }, context);
  assert.equal(values.length, 205); assert.equal(new Set(ids).size, 205);
});
