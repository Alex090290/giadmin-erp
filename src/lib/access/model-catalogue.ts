import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { modules } from "@/modules";
import type { ModuleDefinition, ModuleModel } from "../modules/define";
import type { FieldMetadata } from "../orm/fields";
import type { ModelActor } from "../orm/context";
import { listStateSchema } from "../list/query";
import type { ListPage, ListRecord, ListViewConfig } from "../list/types";
import { assertAccessAdmin } from "./admin";
import { accessFieldsList, accessModelsList, type AccessFieldDescription, type AccessModelDescription } from "./model-catalogue.config";

const typeLabels: Record<FieldMetadata["kind"], string> = { text: "Texto", integer: "Entero", boolean: "Booleano", selection: "Selección", datetime: "Fecha y hora", many2one: "Many2one", image: "Imagen" };
type Entry = { model: AccessModelDescription; fields: AccessFieldDescription[] };

function describeFields(model: ModuleModel): AccessFieldDescription[] {
  const scalar = (name: string, field: FieldMetadata, origin: string, readOnly: boolean): AccessFieldDescription => ({
    id: `${model.id}.${name}`, name, label: field.label ?? name, type: typeLabels[field.kind], origin,
    target: field.kind === "many2one" ? field.target : "", source: field.related ?? "",
    required: field.required, readOnly, sensitive: Boolean(field.sensitive),
  });
  // Projection only: never return schemas, defaults, upload settings or method implementations.
  const stored = Object.entries(model.metadata).map(([name, field]) => scalar(name, field, "Almacenado", Boolean(field.readOnly)));
  const preview = Object.entries(model.contract.previewFields).map(([name, field]) => scalar(name, field.metadata,
    Object.hasOwn(model.contract.relatedFields, name) ? "Relacionado" : Object.hasOwn(model.contract.computedFields, name) ? "Calculado" : "Vista previa", true));
  const lines = Object.entries(model.contract.one2manyFields).map(([name, field]): AccessFieldDescription => ({
    id: `${model.id}.${name}`, name, label: field.one2many.label ?? name, type: "One2many", origin: "Líneas",
    target: field.one2many.target, source: field.one2many.inverse, required: field.one2many.minRows > 0,
    readOnly: false, sensitive: false,
  }));
  return [...stored, ...preview, ...lines];
}

/** Registered declarative definitions only; no schema introspection or record queries. */
export function describeAccessModels(definitions: readonly ModuleDefinition[]): Entry[] {
  return definitions.flatMap(module => module.models.map(entry => {
    const fields = describeFields(entry);
    return { model: { id: entry.id, label: entry.label, name: entry.contract.name, module: module.id, moduleName: module.application.name, fieldCount: fields.length }, fields };
  }));
}

const folded = (value: unknown) => String(value ?? "").normalize("NFD").replace(/\p{Mn}/gu, "").toLocaleLowerCase("es");
const textOperators = ["contains", "eq", "neq", "startsWith", "endsWith", "empty", "notEmpty"];
/** Both catalogue tables share pagination/query validation against server-fixed columns. */
export function accessCataloguePage(records: readonly ListRecord[], input: unknown, config: ListViewConfig): ListPage {
  const state = listStateSchema.parse(input);
  const sortable = config.columns.filter(column => column.sortable).map(column => column.field);
  const filterable = config.columns.filter(column => column.filterable && (!column.type || column.type === "text")).map(column => column.field);
  if (state.invalidFilters || !sortable.includes(state.sort) || state.groupBy?.length || state.groupPath?.length || state.filters.some(filter => !filterable.includes(filter.field) || !textOperators.includes(filter.operator))) throw new Error("Consulta de catálogo inválida.");
  const query = folded(state.query.trim());
  let rows = records.filter(row => !query || config.searchFields.some(field => folded(row[field]).includes(query)));
  for (const filter of state.filters) rows = rows.filter(row => {
    const value = folded(row[filter.field]), expected = folded(filter.value);
    switch (filter.operator) {
      case "eq": return value === expected;
      case "neq": return value !== expected;
      case "contains": return value.includes(expected);
      case "startsWith": return value.startsWith(expected);
      case "endsWith": return value.endsWith(expected);
      case "empty": return !value;
      case "notEmpty": return Boolean(value);
      default: return false;
    }
  });
  rows = [...rows].sort((a, b) => ((typeof a[state.sort] === "number" && typeof b[state.sort] === "number"
    ? Number(a[state.sort]) - Number(b[state.sort]) : folded(a[state.sort]).localeCompare(folded(b[state.sort]), "es", { numeric: true })) || a.id.localeCompare(b.id)) * (state.direction === "asc" ? 1 : -1));
  const total = rows.length, page = Math.min(state.page, Math.max(1, Math.ceil(total / state.pageSize)));
  return { rows: rows.slice((page - 1) * state.pageSize, page * state.pageSize), total, page, pageSize: state.pageSize };
}

async function inspect<T>(prisma: PrismaClient, actor: ModelActor, read: (catalogue: readonly Entry[]) => T): Promise<T> {
  return prisma.$transaction(async tx => {
    await assertAccessAdmin(tx, actor);
    return read(describeAccessModels(modules));
  }, { isolationLevel: "RepeatableRead" });
}

export async function listAccessModels(prisma: PrismaClient, actor: ModelActor, input: unknown) {
  return inspect(prisma, actor, catalogue => ({ ok: true as const, data: accessCataloguePage(catalogue.map(entry => entry.model), input, accessModelsList) }));
}
export async function readAccessModel(prisma: PrismaClient, actor: ModelActor, id: unknown) {
  return inspect(prisma, actor, catalogue => {
    const entry = typeof id === "string" && id.length <= 160 ? catalogue.find(entry => entry.model.id === id) : undefined;
    return entry ? { ok: true as const, values: entry.model } : { ok: false as const, error: "Modelo no disponible en el catálogo declarativo." };
  });
}
export async function listAccessFields(prisma: PrismaClient, actor: ModelActor, input: { id: unknown; state: unknown }) {
  return inspect(prisma, actor, catalogue => {
    const entry = typeof input?.id === "string" && input.id.length <= 160 ? catalogue.find(entry => entry.model.id === input.id) : undefined;
    if (!entry) throw new Error("Modelo no disponible.");
    return { ok: true as const, data: accessCataloguePage(entry.fields, input.state, accessFieldsList) };
  });
}
