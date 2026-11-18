import { z } from "zod";
import { Fields } from "@/lib/orm/fields";
import { fieldInputSchema } from "@/lib/orm/sequence";

export const sequenceSampleFields = {
  name: Fields.Text({ label: "Folio", sequence: { prefix: "TCK-{year}-", padding: 6, reset: "year" } }),
  descripcion: Fields.Text({ label: "Descripción", required: true, maxLength: 200 }),
};
export const sequenceSampleSchema = z.strictObject({ name: fieldInputSchema(sequenceSampleFields.name), descripcion: sequenceSampleFields.descripcion.schema });
export type SequenceSampleValues = z.input<typeof sequenceSampleSchema>;
export type SequenceSampleOutput = z.output<typeof sequenceSampleSchema>;
