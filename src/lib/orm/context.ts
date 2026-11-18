import type { Prisma } from "@/generated/prisma/client";
import type { SavedRecord } from "./record";
export type ModelActor = { id: string; sessionVersion: number };
export type ModelContext<T = Record<string, unknown>> = { tx: Prisma.TransactionClient; actor: ModelActor; operation: "create" | "update"; id?: string; readonly previous: Readonly<SavedRecord<T>> | null };

/** Context of beforeRemove: same transaction and authenticated actor as the deletion. */
export type RemoveContext = { tx: Prisma.TransactionClient; actor: ModelActor; id: string };

export class ModelValidationError extends Error {
  constructor(message: string, readonly fieldErrors?: Record<string, string>) { super(message); }
}

/** Validation of ephemeral action inputs, separate from document field errors. */
export class ActionParameterError extends ModelValidationError {
  constructor(message: string, readonly parameterErrors?: Record<string, string>) { super(message); }
}
