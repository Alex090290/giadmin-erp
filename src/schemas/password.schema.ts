import { z } from "zod";

/** bcrypt only uses the first 72 bytes; longer secrets would be silently truncated. */
export const passwordMaxBytes = 72;
export const passwordBytes = (value: string) => new TextEncoder().encode(value).length;

/**
 * Creation/reset policy: 8 characters minimum, up to bcrypt's 72 UTF-8 bytes, without
 * symbol/case rules and without trimming. Stored credentials keep logging in unchanged.
 */
export const newPasswordSchema = z.string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .refine(value => passwordBytes(value) <= passwordMaxBytes, "La contraseña es demasiado larga (máximo 72 bytes).");
