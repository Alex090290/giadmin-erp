"use server";

import { formatSequence } from "@/lib/orm/sequence";
import { sequenceSampleFields, sequenceSampleSchema } from "./sequence.schema";

/** Fixed fictitious first number: no database counter, persistence or issued folio. */
export async function simulateSequence(input: unknown) {
  const parsed = sequenceSampleSchema.safeParse(input);
  if (!parsed.success || (parsed.data.name !== "" && parsed.data.name !== null)) return { ok: false as const, error: "Esta demo sólo simula un registro nuevo sin folio asignado." };
  return { ok: true as const, values: { ...parsed.data, name: formatSequence(sequenceSampleFields.name.metadata.sequence!, 1n, new Date()) } };
}
