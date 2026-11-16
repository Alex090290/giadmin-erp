"use server";

import { Model, defineModel, depends, type ReactionValues } from "@/lib/orm";
import { resolveCollectionComputed } from "@/lib/orm/collection-computed";
import { listStateSchema } from "@/lib/list/query";
import type { ListResult, ListState } from "@/lib/list/types";
import { createDemoRecords, demoPage } from "./collection-demo";
import { computedCollectionFields, remainingField } from "./computed-collection.fields";
import type { ReactionContext } from "@/lib/orm/reactions";

class DemoVehicle extends Model {
  name = computedCollectionFields.name;
  amount = computedCollectionFields.amount;
  status = computedCollectionFields.status;
  remainingKm = remainingField;
  @depends("amount")
  remaining(values: ReactionValues) { return typeof values.amount === "number" ? 20000 - values.amount : null; }
}
const model = defineModel(DemoVehicle, { name: "ComputedCollectionDemo", table: "computed_collection_demo" });
async function page(input: ListState, group?: string): Promise<ListResult> {
  const parsed = listStateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa la consulta de ejemplo." };
  const result = demoPage(createDemoRecords(), parsed.data, group);
  if (!result.ok) return result;
  // Public, immutable sample data only: production collections use createModelService's authorized transaction.
  const rows = await resolveCollectionComputed(result.data.rows, ["remainingKm"], model, { tx: {}, actor: { id: "public-demo", sessionVersion: 0 } } as ReactionContext);
  return { ...result, data: { ...result.data, rows: rows.map(({ id, name, amount, status, remainingKm }) => ({ id, name, amount, status, remainingKm })) } };
}
export async function loadComputedCollection(input: ListState): Promise<ListResult> { return page(input); }
export async function loadComputedKanban(input: { group: string; state: ListState }): Promise<ListResult> {
  if (!["todo", "progress", "done"].includes(input.group)) return { ok: false, error: "Columna de ejemplo inválida." };
  return page(input.state, input.group);
}
