import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { FieldMetadata } from "./fields";
import { ModelValidationError } from "./context";
import { formatSequence, sequencePeriod } from "./sequence";

export async function assignSequences(tx: Prisma.TransactionClient, model: string, fields: Readonly<Record<string, FieldMetadata>>, input: Readonly<Record<string, unknown>>, previous: Readonly<Record<string, unknown>> | null, now = new Date()) {
  const values = { ...input }, locked: Record<string, string> = {};
  for (const [name, field] of Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))) {
    if (!field.sequence) continue;
    const fail = (message: string) => new ModelValidationError(message, { [name]: message });
    if (previous) {
      const value = previous[name];
      if (typeof value !== "string" || !value || (input[name] !== undefined && input[name] !== value)) throw fail("El folio es de sólo lectura y no puede cambiarse.");
      values[name] = locked[name] = value;
      continue;
    }
    if (input[name] !== undefined && input[name] !== null && input[name] !== "") throw fail("El folio lo asigna el servidor al crear el registro.");
    const configuration = createHash("sha256").update(JSON.stringify(field.sequence)).digest("hex");
    const key = `${model}.${name}`, period = sequencePeriod(field.sequence, now);
    if (!tx.modelSequence) throw fail("Regenera Prisma Client y aplica la migración de secuencias antes de usar folios.");
    let counter;
    try {
      counter = await tx.modelSequence.upsert({
        where: { key_period: { key, period } },
        create: { key, period, configuration, value: 1n },
        update: { value: { increment: 1n } },
        select: { value: true, configuration: true },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2021") throw fail("Aplica la migración de secuencias antes de usar folios.");
      throw error;
    }
    if (counter.configuration !== configuration) throw fail("El formato de esta serie ya está en uso. Su cambio requiere una migración explícita de la secuencia.");
    const value = formatSequence(field.sequence, counter.value, now);
    if (field.kind !== "text" || (field.maxLength !== undefined && value.length > field.maxLength)) throw fail("El folio supera la longitud declarada del campo.");
    values[name] = locked[name] = value;
  }
  return { values, locked: Object.freeze(locked) };
}

/** Business hooks may read the canonical folio, but cannot replace it. */
export function assertSequences(values: Readonly<Record<string, unknown>>, locked: Readonly<Record<string, string>>) {
  for (const [name, expected] of Object.entries(locked)) if (values[name] !== expected) throw new ModelValidationError("La lógica del modelo no puede modificar el folio.", { [name]: "Conserva el folio asignado por el servidor." });
}
