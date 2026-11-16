import { z } from "zod";

export const capabilitiesSampleSchema = z.object({
  id: z.string().min(1),
  revision: z.iso.datetime(),
  name: z.string().trim().min(1, "Nombre: campo obligatorio."),
  state: z.enum(["draft", "active"]),
});
export type CapabilitiesSampleValues = z.infer<typeof capabilitiesSampleSchema>;
