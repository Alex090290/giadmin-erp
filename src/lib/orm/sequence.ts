import { z } from "zod";
import type { Field } from "./fields";

export type SequenceOptions = { readonly prefix?: string; readonly padding?: number; readonly reset?: "none" | "year" };
export type SequenceConfig = { readonly prefix: string; readonly padding: number; readonly reset: "none" | "year" };

export function sequenceConfig(options: SequenceOptions): SequenceConfig {
  if (!options || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some(key => !["prefix", "padding", "reset"].includes(key))) throw new Error("sequence requiere prefix, padding y reset válidos.");
  const prefix = options.prefix ?? "", padding = options.padding ?? 6, reset = options.reset ?? "none";
  if (typeof prefix !== "string" || prefix.length > 60 || prefix.trim() !== prefix || /[\x00-\x1f\x7f]/.test(prefix) || /[{}]/.test(prefix.replaceAll("{year}", "")) || !Number.isSafeInteger(padding) || padding < 1 || padding > 12 || !["none", "year"].includes(reset)) throw new Error("sequence admite prefijo de hasta 60 caracteres con {year}, padding de 1 a 12 y reset none/year.");
  if (reset === "year" && !prefix.includes("{year}")) throw new Error("El reinicio anual necesita {year} en el prefijo para conservar folios únicos.");
  return Object.freeze({ prefix, padding, reset });
}

export function sequencePeriod(config: SequenceConfig, now: Date) {
  const year = now.getUTCFullYear();
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error("Fecha de secuencia inválida.");
  return config.reset === "year" ? String(year).padStart(4, "0") : "all";
}

export function formatSequence(config: SequenceConfig, value: bigint, now: Date) {
  sequencePeriod(config, now);
  if (value < 1n || value > 9223372036854775807n) throw new Error("La secuencia agotó su rango.");
  return config.prefix.replaceAll("{year}", String(now.getUTCFullYear()).padStart(4, "0")) + value.toString().padStart(config.padding, "0");
}

/** Drafts may have an empty folio; stored descriptors keep their strict schema. */
export function fieldInputSchema<I, O>(field: Field<I, O>) {
  return field.metadata.sequence ? z.union([field.schema, z.literal(""), z.null()]) : field.schema;
}
