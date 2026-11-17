import "server-only";
import { Model } from "../orm/model";
import { isField, isOne2many, type Field } from "../orm/fields";
import { relationFieldName } from "../orm/display";

type ModelClass = new () => Model;
const extensionTag = Symbol("modules.extension");

/**
 * Extension of a model declared by another module (Odoo `_inherit`, as a class mixin).
 * `apply` receives the class built so far (the base, or the base already extended by
 * modules this one depends on) and returns a subclass; `super` keeps the base rules.
 */
export type ModelExtension<B extends ModelClass = ModelClass> = {
  readonly [extensionTag]: true;
  readonly base: B;
  readonly apply: (Base: ModelClass) => ModelClass;
};

/**
 * `extendModel(Vehicle, Base => class extends Base { responsableId = Fields.Many2one(...) })`.
 * Register it in the manifest of the extending module: `extends: { "flota.vehicle": ... }`,
 * with `depends: ["flota"]`. New persistent fields live in a companion table owned by the
 * extending module; access, rules and revision remain those of the base model.
 */
export function extendModel<B extends ModelClass, E extends B>(base: B, mixin: (Base: B) => E): ModelExtension<B> {
  if (typeof base !== "function" || !(base.prototype instanceof Model) || typeof mixin !== "function") throw new Error("extendModel necesita la clase del modelo base y una función Base => class extends Base {...}.");
  return Object.freeze({ [extensionTag]: true as const, base, apply: mixin as unknown as (Base: ModelClass) => ModelClass });
}

export function isModelExtension(value: unknown): value is ModelExtension {
  return typeof value === "object" && value !== null && (value as Record<symbol, unknown>)[extensionTag] === true;
}

/** Fields an extension declares itself, read by applying it to an empty model (no base rules run). */
export function extensionFields(extension: ModelExtension): Readonly<Record<string, Field>> {
  class Probe extends Model {}
  const Extended = extension.apply(Probe);
  if (typeof Extended !== "function" || !(Extended.prototype instanceof Probe)) throw new Error("La extensión debe devolver una subclase: Base => class extends Base {...}.");
  const fields: Record<string, Field> = {};
  for (const [name, value] of Object.entries(new Extended())) {
    if (value === undefined || typeof value === "function") continue;
    if (isOne2many(value)) throw new Error(`${name}: las extensiones todavía no admiten One2many.`);
    if (isField(value)) fields[name] = value;
  }
  return fields;
}

/** Field names of a declaration, including the relation aliases Prisma derives from Many2one. */
export function declaredNames(Declaration: ModelClass): ReadonlySet<string> {
  const names = new Set<string>();
  for (const [name, value] of Object.entries(new Declaration())) {
    if (value === undefined || typeof value === "function") continue;
    names.add(name);
    if (isField(value) && value.metadata.kind === "many2one") names.add(relationFieldName(name));
  }
  return names;
}
