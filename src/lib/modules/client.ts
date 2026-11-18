import { z } from "zod";
import { fieldInputSchema } from "../orm/sequence";
import { Fields } from "../orm/fields";
import type { Field } from "../orm/fields";
import { fieldFromMetadata } from "./fields";
import { recordIdentityShape, validateRecordIdentity } from "../orm/record";
import { createSignedCloudinaryImageUploader } from "../uploads/cloudinary";
import type { ModelLookupRequest } from "../many2one/model-lookup";
import type { ReactionRequest } from "../orm/reactions.types";
import { collectionFieldMetadata, type ModelClientConfig } from "./config";
import { modelLookup, modelReact, modelSignImage } from "./actions";

const mapValues = <T, R>(source: Readonly<Record<string, T>>, map: (value: T, key: string) => R) =>
  Object.fromEntries(Object.entries(source).map(([key, value]) => [key, map(value, key)])) as Record<string, R>;

export type ModelUI = ReturnType<typeof buildModelUI>;

/** Everything a form or collection needs on the client, built once per config. */
export function buildModelUI(config: ModelClientConfig) {
  const fields = mapValues(config.fields, fieldFromMetadata);
  const many2many = mapValues(config.many2many ?? {}, metadata => Fields.Many2many(metadata.target, Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "target"))));
  const readFields = mapValues(config.preview, fieldFromMetadata);
  const lines = mapValues(config.lines ?? {}, line => {
    const fields = mapValues(line.fields, fieldFromMetadata);
    const schema = z.strictObject(mapValues(fields, field => fieldInputSchema(field))).extend(recordIdentityShape).superRefine(validateRecordIdentity as never);
    return {
      fields, schema, ...line.metadata, capabilities: line.capabilities,
      createRow: () => mapValues(fields, field => field.createDefault()),
      lookups: mapValues(line.lookups, target => (request: ModelLookupRequest) => modelLookup(target, request)),
      uploads: Object.fromEntries(Object.entries(line.fields).filter(([, field]) => field.kind === "image").map(([name]) => [name, createSignedCloudinaryImageUploader(() => modelSignImage(line.model, name))])),
    };
  });
  const schema = z.strictObject({ ...mapValues(fields, field => fieldInputSchema(field)), ...mapValues(many2many, field => field.schema), ...mapValues(lines, line => z.array(line.schema).min(line.minRows).max(line.maxRows)) }).extend(recordIdentityShape).superRefine(validateRecordIdentity as never);
  const collectionFields: Record<string, Pick<Field, "metadata">> = mapValues(collectionFieldMetadata(config), metadata => ({ metadata }));
  const images = Object.entries(config.fields).filter(([, field]) => field.kind === "image" && !field.sensitive).map(([name]) => name);
  const recordUI = {
    fields, readFields, lines, many2many,
    reactions: { rules: config.reactionRules, load: (request: ReactionRequest) => modelReact(config.id, request) },
    lookups: mapValues(config.lookups, target => (request: ModelLookupRequest) => modelLookup(target, request)),
    uploads: Object.fromEntries(images.map(name => [name, createSignedCloudinaryImageUploader(() => modelSignImage(config.id, name))])),
  };
  return {
    config, fields, readFields, collectionFields, schema, recordUI,
    createDefaults: (): Record<string, unknown> => ({ ...mapValues(fields, field => field.createDefault()), ...mapValues(many2many, field => field.createDefault()), ...mapValues(lines, () => []) }),
  };
}
