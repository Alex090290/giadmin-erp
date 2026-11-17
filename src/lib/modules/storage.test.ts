import assert from "node:assert/strict";
import { test } from "node:test";
import { Fields, Model, action } from "../orm";
import { defineModule } from "./define";
import { extendModel } from "./extend";
import { composeModules } from "./compose";
import { extensionWhere, storageProjection } from "./storage";
import { createRepository } from "./repository";

class Item extends Model { name = Fields.Text({ required: true }); }
const base = defineModule({ id: "base", name: "Base", icon: "box", models: { item: Item } });
const Extra = extendModel(Item, Base => {
  class Extra extends Base {
    rank = Fields.Integer({ required: true, default: 1, groupable: true });
    code = Fields.Text({ unique: true, searchable: true });
    itemId = Fields.Many2one("BaseItem");
    image = Fields.Image({ folder: "test-extensions" });
    related = Fields.Text({ related: "itemId.code" });
    @action({ label: "Run", groups: ["operator"] })
    run() { return {}; }
  }
  return Extra;
});
const loader = async () => ({ default: () => null });
const extended = defineModule({ id: "extra", name: "Extra", icon: "box", depends: ["base"], models: {}, groups: { operator: "Operator" },
  extends: { "base.item": { model: Extra, views: { form: loader } } },
  rules: [{ id: "mine", label: "Mine", models: "base.item", groups: ["operator"], domain: [{ field: "rank", operator: "lte", value: 2 }] }],
});
const model = composeModules([base, extended])[0].models[0];
const relation = model.extensions[0].relation!;

test("advanced extension contracts publish query fields, isolate virtuals and retain lazy views and action groups", () => {
  assert.equal(model.extensions[0].views?.form, loader);
  assert.ok(model.list.fields.includes("related"));
  assert.ok(model.list.groupable?.includes("rank"));
  assert.ok(model.list.searchFields.includes("code"));
  assert.ok(!model.list.filterable?.includes("related"));
  assert.equal(extended.profile.module.models[0].model.metadata.related, undefined);
  assert.deepEqual(extended.access.rules[0].models, ["base.item"]);
  assert.deepEqual(model.contract.actions[0].groups, ["extra.operator"]);
  assert.ok(Object.isFrozen(model.contract.actions[0]) && Object.isFrozen(model.contract.actions[0].groups));
  assert.throws(() => defineModule({ id: "bad", name: "Bad", icon: "box", models: {}, rules: [{ id: "x", label: "X", models: "base.item", domain: [] }] }), /inexistente/);
});

test("predicates translate logical fields, empty rows and NOT without rewriting already physical scopes", () => {
  assert.deepEqual(extensionWhere(model, { rank: 2 }), { [relation]: { is: { rank: 2 } } });
  assert.deepEqual(extensionWhere(model, { rank: null }), { [relation]: { is: null } });
  assert.deepEqual(extensionWhere(model, { rank: { not: null } }), { [relation]: { isNot: null } });
  assert.deepEqual(extensionWhere(model, { code: null }), { OR: [{ [relation]: { is: { code: null } } }, { [relation]: { is: null } }] });
  const logical = { AND: [{ name: "A" }, { NOT: { rank: { gt: 2 } } }, { OR: [{ code: "x" }, { code: "y" }] }] };
  const physical = extensionWhere(model, logical);
  assert.deepEqual(extensionWhere(model, physical), physical);
  assert.deepEqual(logical.AND[0], { name: "A" });
  assert.match(JSON.stringify(physical), /NOT.*is.*rank/);
});

test("logical projections map nested extended relations and leaves while flattening only selected storage", () => {
  const storage = storageProjection(model, [model]);
  assert.deepEqual(storage.select({ id: true, code: true, item: { select: { id: true, code: true } } }), {
    id: true, [relation]: { select: { code: true, item: { select: { id: true, [relation]: { select: { code: true } } } } } },
  });
  assert.deepEqual(storage.row({ id: "a", [relation]: { code: "A", item: { id: "b", [relation]: { code: "B" } } } }), { id: "a", code: "A", item: { id: "b", code: "B" } });
});

test("group pagination appends a single SQL-null group at the boundary and never repeats it beyond the end", async () => {
  const calls: Record<string, unknown>[] = [];
  const repository = createRepository(model, base.profile.module);
  const rows = [1, 2, 3].map(rank => ({ rank, _count: { _all: 2 } }));
  const tx = {
    baseItem: { findMany: async () => [], count: async () => 4 },
    extraBaseItem: { findMany: async () => [], groupBy: async (args: { skip: number; take: number }) => { calls.push(args); return rows.slice(args.skip, args.skip + args.take); } },
  } as never;
  const query = { where: { code: { contains: "x" } }, field: "rank", skip: 0, take: 2 };
  assert.deepEqual(await repository.groups!(tx, query), [{ value: 1, count: 2 }, { value: 2, count: 2 }]);
  assert.deepEqual(await repository.groups!(tx, { ...query, skip: 2 }), [{ value: 3, count: 2 }, { value: null, count: 4 }]);
  assert.deepEqual(await repository.groups!(tx, { ...query, skip: 3 }), [{ value: null, count: 4 }]);
  assert.deepEqual(await repository.groups!(tx, { ...query, skip: 4 }), []);
  assert.match(JSON.stringify(calls[0]), /record.*is.*contains/);
  assert.ok(calls.every(call => Number(call.take) <= 2), "group keys are paged in SQL");
});
