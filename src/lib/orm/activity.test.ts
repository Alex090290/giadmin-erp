import assert from "node:assert/strict";
import test from "node:test";
import { Fields } from "./fields";
import { trackedChanges, activityNoteSchema, activityRequestSchema } from "./activity";
import { fieldExpression } from "./generator/generate";
import { readActivity } from "./activity.server";
import type { Prisma } from "@/generated/prisma/client";

test("creation is a summary without an initial field snapshot; comparisons start on edits", () => {
  const metadata = { name: Fields.Text({ tracking: true }).metadata, active: Fields.Boolean({ tracking: true }).metadata };
  assert.deepEqual(trackedChanges(metadata, null, { name: "Nuevo", active: true }), []);
  assert.deepEqual(trackedChanges(metadata, { name: "Nuevo", active: true }, { name: "Editado", active: true }).map(change => [change.field, change.before, change.after]), [["name", "Nuevo", "Editado"]]);
});

test("old creation snapshots are hidden on read while edit differences remain visible", async () => {
  const change = { field: "name", label: "Nombre", type: "text", before: null, after: "Valor inicial anterior" };
  const common = { createdAt: new Date("2026-11-10T18:00:00.000Z"), body: null, changes: [change], actor: { id: "author", login: "demo", partner: null } };
  const tx = { recordActivity: { findMany: async () => [{ ...common, id: "old-create", kind: "create" }, { ...common, id: "edit", kind: "update" }] } } as unknown as Prisma.TransactionClient;
  const page = await readActivity(tx, "Example", { name: Fields.Text({ tracking: true }).metadata }, { id: "record" });
  assert.deepEqual(page.entries[0].changes, []);
  assert.deepEqual(page.entries[1].changes, [change]);
});

test("tracking is explicit, retains false/zero/null, and never captures untracked or sensitive fields", () => {
  const metadata = {
    name: Fields.Text({ tracking: true, label: "Nombre" }).metadata,
    active: Fields.Boolean({ tracking: true }).metadata,
    count: Fields.Integer({ tracking: true }).metadata,
    secret: Fields.Text({ sensitive: true }).metadata,
    plain: Fields.Text().metadata,
  };
  const changes = trackedChanges(metadata, { name: "Anterior", active: true, count: 1, secret: "viejo" }, { name: null, active: false, count: 0, secret: "nuevo", plain: "ignorado" });
  assert.deepEqual(changes.map(change => [change.field, change.before, change.after]), [["name", "Anterior", null], ["active", true, false], ["count", 1, 0]]);
  assert.deepEqual(trackedChanges(metadata, { active: false, count: 0 }, { active: false, count: 0 }), []);
  assert.throws(() => Fields.Text({ tracking: true, sensitive: true }), /sensible/);
  assert.throws(() => Fields.Text({ tracking: "yes" } as never), /booleano/);
});

test("historical Many2one changes resolve current labels in batches and hide inaccessible IDs and stale labels", async () => {
  const metadata = {
    categoryId: Fields.Many2one("Category", { tracking: true }).metadata,
    otherId: Fields.Many2one("Category", { tracking: true }).metadata,
    privateId: Fields.Many2one("Private", { tracking: false }).metadata,
  };
  const changes = [
    { field: "categoryId", label: "Categoría", type: "many2one", before: "old", after: "current", beforeLabel: "Restricted old label" },
    { field: "otherId", label: "Otra", type: "many2one", before: null, after: "current" },
    { field: "privateId", label: "Privado", type: "many2one", before: null, after: "private" },
  ];
  const tx = { recordActivity: { findMany: async () => [{ id: "event", kind: "update", createdAt: new Date("2026-11-18T00:00:00.000Z"), body: null, changes, actor: { id: "author", login: "demo", partner: null } }] } } as unknown as Prisma.TransactionClient;
  let name = "Soporte", readable = true, calls = 0;
  const resolve = async (target: string, ids: readonly string[]) => {
    calls++;
    assert.equal(target, "Category");
    assert.deepEqual(ids, ["old", "current"], "deduplicates both sides and fields, never resolves untracked fields");
    return readable ? new Map([["current", name]]) : new Map<string, string>();
  };
  const page = await readActivity(tx, "Ticket", metadata, { id: "record" }, resolve);
  assert.equal(calls, 1);
  assert.equal(page.entries[0].changes[0].afterLabel, "Soporte");
  assert.equal(page.entries[0].changes[0].before, "Registro no disponible");
  assert.equal(page.entries[0].changes[1].before, null);
  assert.equal(page.entries[0].changes.length, 2);
  assert.doesNotMatch(JSON.stringify(page), /Restricted old label|"old"|"private"/);
  assert.equal(changes[0].before, "old", "does not rewrite stored history");
  name = "Soporte renombrado";
  assert.equal((await readActivity(tx, "Ticket", metadata, { id: "record" }, resolve)).entries[0].changes[0].afterLabel, name);
  readable = false;
  assert.doesNotMatch(JSON.stringify(await readActivity(tx, "Ticket", metadata, { id: "record" }, resolve)), /Soporte|"current"/);
  await assert.rejects(readActivity(tx, "Ticket", metadata, { id: "record" }, async () => { throw new Error("database unavailable"); }), /database unavailable/);
});

test("activity resolves at most 100 IDs per batch and does not resolve creation snapshots", async () => {
  const metadata = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`field${i}`, Fields.Many2one("Category", { tracking: true }).metadata]));
  const changes = Object.keys(metadata).map((field, i) => ({ field, label: field, type: "many2one", before: null, after: `id${i}` }));
  const common = { createdAt: new Date("2026-11-18T00:00:00.000Z"), body: null, changes, actor: { id: "author", login: "demo", partner: null } };
  const tx = { recordActivity: { findMany: async () => [{ ...common, id: "create", kind: "create" }, { ...common, id: "update", kind: "update" }] } } as unknown as Prisma.TransactionClient;
  const batches: number[] = [];
  const page = await readActivity(tx, "Ticket", metadata, { id: "record" }, async (_target, ids) => {
    batches.push(ids.length);
    return new Map(ids.map(id => [id, `Label ${id}`]));
  });
  assert.deepEqual(batches, [100, 1]);
  assert.deepEqual(page.entries[0].changes, []);
  assert.equal(page.entries[1].changes[100].afterLabel, "Label id100");
});

test("selection labels are snapshots and the generator preserves tracking declarations", () => {
  const field = Fields.Selection([{ value: "draft", label: "Borrador" }, { value: "done", label: "Terminado" }], { tracking: true });
  const [change] = trackedChanges({ status: field.metadata }, { status: "draft" }, { status: "done" });
  assert.equal(change.beforeLabel, "Borrador"); assert.equal(change.afterLabel, "Terminado");
  assert.match(fieldExpression(field.metadata), /"tracking":true/);
});

test("note and cursor contracts reject forged actor, model, revisions, blank notes and oversized bodies", () => {
  const valid = { id: "record", body: " Nota interna ", requestId: "cf4a9d98-7aee-4b1c-9d76-14ada55938d2" };
  assert.equal(activityNoteSchema.parse(valid).body, "Nota interna");
  for (const patch of [{ actorId: "another" }, { model: "Other" }, { changes: [] }, { body: " " }, { body: "x".repeat(4001) }, { requestId: "invalid" }]) assert.equal(activityNoteSchema.safeParse({ ...valid, ...patch }).success, false);
  assert.equal(activityRequestSchema.safeParse({ id: "record", model: "Other" }).success, false);
  assert.equal(activityRequestSchema.safeParse({ id: "record", cursor: { id: "x", createdAt: "invalid" } }).success, false);
});
