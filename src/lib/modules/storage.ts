import "server-only";
import type { ModuleModel } from "./define";
import { relationFieldName } from "../orm/display";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);

/** Only server-compiled scalar predicates are translated. Never traverse an arbitrary relation. */
export function extensionWhere(entry: Pick<ModuleModel, "extensions" | "metadata">, where: ObjectValue): ObjectValue {
  const fields = new Map(entry.extensions.flatMap(extension => extension.relation ? extension.fields.map(field => [field, extension.relation!] as const) : []));
  const visit = (predicate: ObjectValue): ObjectValue => {
    const conditions = Object.entries(predicate).map(([key, value]): ObjectValue => {
      if (["AND", "OR", "NOT"].includes(key)) return { [key]: Array.isArray(value) ? value.map(item => object(item) ? visit(item) : item) : object(value) ? visit(value) : value };
      const relation = fields.get(key);
      if (!relation) return { [key]: value };
      const present = { [relation]: { is: { [key]: value } } };
      if (entry.metadata[key]?.required && object(value) && value.not === null) return { [relation]: { isNot: null } };
      // Empty companion rows have SQL NULL semantics in queries and collections.
      const matchesNull = value === null || (object(value) && value.equals === null);
      return matchesNull ? entry.metadata[key]?.required ? { [relation]: { is: null } } : { OR: [present, { [relation]: { is: null } }] } : present;
    });
    return conditions.length === 1 ? conditions[0] : conditions.length ? { AND: conditions } : {};
  };
  return fields.size ? visit(where) : where;
}

/** Translate a logical select tree to companion relations, preserving publication boundaries. */
export function storageProjection(entry: ModuleModel, models: readonly ModuleModel[]) {
  const byName = new Map(models.map(model => [model.contract.name, model]));
  const relationTarget = (model: ModuleModel, name: string) => Object.entries(model.metadata).find(([field, metadata]) => metadata.kind === "many2one" && relationFieldName(field) === name)?.[1];
  const project = (model: ModuleModel, select: ObjectValue): ObjectValue => {
    const result: ObjectValue = {};
    for (const [name, value] of Object.entries(select)) {
      const target = relationTarget(model, name);
      const nested = target?.kind === "many2one" ? byName.get(target.target) : undefined;
      const selected = nested && object(value) && object(value.select) ? { ...value, select: project(nested, value.select) } : value;
      const companion = model.extensions.find(extension => extension.relation && extension.fields.some(field => field === name || (model.metadata[field]?.kind === "many2one" && relationFieldName(field) === name)));
      if (companion?.relation) {
        const current = (result[companion.relation] as { select: ObjectValue } | undefined) ?? { select: {} };
        current.select[name] = selected;
        result[companion.relation] = current;
      } else result[name] = selected;
    }
    return result;
  };
  const flatten = (model: ModuleModel, row: ObjectValue): ObjectValue => {
    const result = { ...row };
    for (const extension of model.extensions) if (extension.relation && Object.hasOwn(result, extension.relation)) {
      const nested = result[extension.relation];
      if (object(nested)) Object.assign(result, nested);
      else for (const name of extension.fields) result[name] = null;
      delete result[extension.relation];
    }
    for (const [name, value] of Object.entries(result)) {
      const target = relationTarget(model, name);
      const nested = target?.kind === "many2one" ? byName.get(target.target) : undefined;
      if (nested && object(value)) result[name] = flatten(nested, value);
    }
    return result;
  };
  return {
    select: (select: ObjectValue, model = entry) => project(model, select),
    row: (row: ObjectValue, model = entry) => flatten(model, row),
    target: (name: string) => byName.get(name),
  };
}
