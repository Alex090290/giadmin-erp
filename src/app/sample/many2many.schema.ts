import { z } from "zod";
import { Fields } from "@/lib/orm/fields";

export const tags = Fields.Many2many("SampleTag", { label: "Etiquetas", minSelected: 1, maxSelected: 3 });
export const many2manySampleSchema = z.strictObject({ etiquetas: tags.schema });
export type Many2manySampleValues = z.infer<typeof many2manySampleSchema>;
