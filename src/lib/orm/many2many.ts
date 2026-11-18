import type { Many2manyField } from "./fields";
import { ModelValidationError } from "./context";
import type { RelationAccess } from "./relation-access";

/** Stable names shared by schema generation and the declarative repository. */
export function many2manyStorage(model: { name: string; table: string }, field: string) {
  const name = `${model.name}${field[0].toUpperCase()}${field.slice(1)}Link`;
  const table = `${model.table}_${field.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()}_rel`;
  if (table.length > 63 || name.length > 80) throw new Error(`${model.name}.${field}: nombre Many2many demasiado largo.`);
  return { name, table, source: `${name[0].toLowerCase()}${name.slice(1)}SourceRecords`, target: `${name[0].toLowerCase()}${name.slice(1)}TargetRecords` };
}

/** Reject forged, missing and inaccessible IDs before hooks can discard the input. */
export async function validateMany2many(values: Readonly<Record<string, unknown>>, fields: Readonly<Record<string, Many2manyField>>, access: RelationAccess | undefined) {
  for (const [name, field] of Object.entries(fields)) {
    const parsed = field.schema.safeParse(values[name]);
    const fail = () => new ModelValidationError("Revisa la selección de relaciones.", { [name]: "Envía IDs únicos de registros existentes y accesibles dentro del límite permitido." });
    if (!parsed.success) throw fail();
    if (!parsed.data.length) continue;
    if (!access) throw fail();
    const readable = await access(field.many2many.target, parsed.data);
    if (parsed.data.some(id => !readable.has(id))) throw fail();
  }
}
