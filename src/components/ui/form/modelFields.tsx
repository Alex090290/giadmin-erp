"use client";
import { createContext, useContext } from "react";
import type { FormReactions, ReactionState } from "./useModelReactions";
import type { PublishedFields } from "@/lib/orm/presentation";
import type { Many2OneLoader } from "@/lib/many2one/model-lookup";
import type { ImageUploader } from "./image.types";
import type { FieldDirection } from "./field.types";
import { useFieldDirection } from "./fieldDirection";

export type FormLineModel = {
  label?: string; minRows: number; maxRows: number; invisible?: boolean;
  fields: PublishedFields;
  createRow: () => Record<string, unknown>;
  capabilities: { read: boolean; create: boolean; write: boolean; unlink: boolean };
  lookups?: Readonly<Record<string, Many2OneLoader>>;
  uploads?: Readonly<Record<string, ImageUploader>>;
};
export type FormModel = { lines?: Readonly<Record<string, FormLineModel>>; readFields?:PublishedFields; reactions?:FormReactions; reactionState?:ReactionState; retryReaction?:()=>void; fields: PublishedFields; lookups?: Readonly<Record<string, Many2OneLoader>>; uploads?: Readonly<Record<string, ImageUploader>> };
export const FormModelContext = createContext<FormModel | undefined>(undefined);
/** Shared readonly contract: never register computed/related values with RHF. */
export function useModelReadField(name:string, kind:string) {
  const model = useContext(FormModelContext);
  const descriptor = model?.readFields?.[name];
  if (!descriptor || descriptor.metadata.kind !== kind || descriptor.metadata.sensitive) throw new Error(`Campo de lectura no publicado o incompatible: ${name}.`);
  return {metadata:descriptor.metadata,value:model?.reactionState?.preview[name],state:model?.reactionState,retry:model?.retryReaction};
}
/** Explicit props (including false/empty labels) override inherited presentation. */
export function useModelField<P extends { name: string; direction?: FieldDirection }>(props: P, kind: string): P {
  const model = useContext(FormModelContext);
  const direction = useFieldDirection(props.direction);
  const layoutProps = direction === props.direction ? props : { ...props, direction };
  const indexed = /^([a-z][A-Za-z0-9]*)\.\d+\.([a-z][A-Za-z0-9]*)$/.exec(props.name);
  const line = indexed ? model?.lines?.[indexed[1]] : undefined;
  const key = indexed?.[2] ?? props.name;
  const fields = line?.fields ?? model?.fields;
  if (!fields || !Object.hasOwn(fields, key)) return layoutProps;
  const metadata = fields[key].metadata;
  if (metadata.sensitive || metadata.kind !== kind) throw new Error(`Contrato incompatible: ${props.name} (${kind}).`);
  const defaults: Record<string, unknown> = { label: metadata.label, required: metadata.kind === "boolean" ? undefined : metadata.required };
  if (metadata.kind === "text") { defaults.maxLength = metadata.maxLength; defaults.minLength = metadata.minLength; }
  if (metadata.kind === "selection") defaults.options = metadata.choices;
  if (metadata.kind === "many2one" && !("model" in props && props.model !== undefined)) defaults.load = (line?.lookups ?? model?.lookups)?.[key];
  if (metadata.kind === "image") defaults.upload = (line?.uploads ?? model?.uploads)?.[key];
  if (metadata.kind === "integer") defaults.allowNegative = (metadata.min ?? -2147483648) < 0;
  return { ...defaults, ...Object.fromEntries(Object.entries(layoutProps).filter(([, value]) => value !== undefined)) } as P;
}
