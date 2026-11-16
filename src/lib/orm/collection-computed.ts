import "server-only";
import type { ListRecord } from "../list/types";
import type { ComputedRule, ReactionContext, ReactionValues } from "./reactions";

export type CollectionComputed = {
  readonly computedRules?: readonly ComputedRule[];
  computeCollection?(names: readonly string[], values: ReactionValues, context: ReactionContext): Promise<Record<string, string | number | null>>;
};

/** Validate fixed server publication before any query; no hidden dependency may leak through a formula. */
export function validateCollectionComputed(model: CollectionComputed, names: readonly string[], published: readonly string[]) {
  if (!names.length) return;
  if (!model.computeCollection || names.some(name => !model.computedRules?.some(rule => rule.outputs.includes(name)))) throw new Error("El proveedor no admite los campos compute publicados.");
  for (const rule of model.computedRules ?? []) {
    if (rule.outputs.some(name => names.includes(name)) && rule.reads.some(name => !published.includes(name))) throw new Error("Las dependencias de compute deben estar publicadas en la colección.");
  }
}

/** Compute only this authorized page. Dependencies are already in its repository DTO; no extra reads. */
export async function resolveCollectionComputed(rows: readonly ListRecord[], names: readonly string[], model: CollectionComputed, context: ReactionContext): Promise<ListRecord[]> {
  if (!rows.length || !names.length) return [...rows];
  if (!model.computeCollection) throw new Error("El proveedor no admite compute en colecciones.");
  const result: ListRecord[] = [];
  for (let offset = 0; offset < rows.length; offset += 100) {
    for (const row of rows.slice(offset, offset + 100)) {
      const values = await model.computeCollection(names, row, Object.freeze({ ...context, id: row.id }));
      result.push({ ...row, ...values });
    }
  }
  return result;
}
