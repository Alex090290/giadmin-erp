import "server-only";
import type { ComponentType } from "react";
import { availableCollectionViews, collectionFieldMetadata, collectionViews, modelIdPattern, type CollectionView, type ModelClientConfig } from "./config";
import { defineApplication, type ApplicationManifest, type ApplicationMenu, type ApplicationMenuLink } from "../applications/manifest";
import { defineModel, Model } from "../orm/model";
import { Fields, type Field, type FieldMetadata } from "../orm/fields";
import { validateCollectionComputed } from "../orm/collection-computed";
import type { ModelListPolicy } from "../orm/service";
import type { GenerationModel } from "../orm/generator/generate";
import type { GenerationProfile } from "../orm/generator/profile";
import type { ListViewConfig } from "../list/types";
import { declareAccess, readGroups, type AccessSpec, type ModuleAccess } from "../access/declare";
import { compileKanbanConfig } from "../kanban/config";
import type { KanbanConfig, KanbanTransition } from "../kanban/types";
import { declaredNames, extensionFields, isModelExtension, type ModelExtension } from "./extend";

type ModelClass = new () => Model;
export type ModuleModelSpec = ModelClass | {
  readonly model: ModelClass;
  /** Snake-case table override; defaults to `<module>_<key>`. */
  readonly table?: string;
  /** Override of the list policy derived from Field metadata. */
  readonly list?: Partial<ModelListPolicy>;
  readonly kanban?: string | KanbanConfig;
  readonly view?: CollectionView;
  readonly defaultSort?: ListViewConfig["defaultSort"];
  /** Custom views (eject). Without them the default list/form are used. */
  readonly views?: ModelViews;
};
export type ModuleModelOptions = Exclude<ModuleModelSpec, ModelClass>;
export type ModelFormView = ComponentType<{ config: ModelClientConfig; id?: string }>;
export type ModelListView = ComponentType<{ config: ModelClientConfig }>;
/**
 * Lazy loaders (`() => import("./views/TareaForm")`): views are client components, and a
 * static import would load React into scripts such as orm:sync that read the manifest.
 */
export type ModelViews = {
  readonly form?: () => Promise<{ default: ModelFormView }>;
  readonly list?: true | (() => Promise<{ default: ModelListView }>);
  readonly card?: true | (() => Promise<{ default: ModelListView }>);
  readonly kanban?: true | (() => Promise<{ default: ModelListView }>);
};
/** Menu entries reference model keys; nested objects create one group level. */
export type ModuleMenu = Readonly<Record<string, string | Readonly<Record<string, string>>>>;

export type ModuleSpec = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version?: string;
  /** Lucide icon name, e.g. "flask-conical". Resolved by the server registry, not by scripts. */
  readonly icon: string;
  readonly depends?: readonly string[];
  readonly models: Readonly<Record<string, ModuleModelSpec>>;
  /** Models of other modules extended by this one: `{ "flota.vehicle": extendModel(Vehicle, ...) }`. */
  readonly extends?: Readonly<Record<string, ModelExtension>>;
  readonly menu?: ModuleMenu;
} & AccessSpec;

/** Extension fields as presented on the extended model (browser-safe names only). */
export type ModelExtensionInfo = {
  readonly module: string;
  readonly label: string;
  /** Persistent fields stored in the companion table. */
  readonly fields: readonly string[];
  /** Virtual compute fields declared by the extension. */
  readonly computed: readonly string[];
  /** Prisma relation (on the base model) to the companion row; absent without persistent fields. */
  readonly relation?: string;
};

/** Compiled declaration of a model extension; the registry composes it onto the base model. */
export type ModuleExtension = {
  /** Extended model id (`<module>.<key>`). */
  readonly target: string;
  readonly module: string;
  readonly label: string;
  readonly extension: ModelExtension;
  readonly fields: readonly string[];
  readonly computed: readonly string[];
  readonly companion?: { readonly name: string; readonly table: string; readonly relation: string };
};

export type ModuleModel = {
  /** Public identifier used by actions and routes: `<module>.<key>`. */
  readonly id: string;
  readonly key: string;
  readonly module: string;
  readonly route: `/erp/${string}`;
  readonly label: string;
  readonly delegate: string;
  readonly contract: ReturnType<typeof defineModel<ModelClass>>;
  /** Same as contract.metadata, typed for generic code. */
  readonly metadata: Readonly<Record<string, FieldMetadata>>;
  readonly clientFields: readonly string[];
  readonly list: ModelListPolicy;
  readonly kanban?: string;
  readonly kanbanTransitions?: readonly KanbanTransition[];
  readonly view: CollectionView;
  readonly collectionViews: readonly CollectionView[];
  readonly defaultSort?: ListViewConfig["defaultSort"];
  readonly views: ModelViews;
  /** Original manifest declaration, recompiled by the registry when other modules extend it. */
  readonly declaration: ModuleModelOptions;
  /** Extensions composed onto this model by the registry (empty in the declaring module). */
  readonly extensions: readonly ModelExtensionInfo[];
};

export type ModuleDefinition = {
  readonly id: string;
  /** Application metadata without the icon component (see registry). */
  readonly application: Omit<ApplicationManifest, "icon">;
  readonly icon: string;
  readonly models: readonly ModuleModel[];
  readonly profile: GenerationProfile;
  readonly access: ModuleAccess;
  readonly extensions: readonly ModuleExtension[];
};

const key = /^[a-z][a-z0-9]*$/;
const pascal = (value: string) => value.split("-").map(part => part[0].toUpperCase() + part.slice(1)).join("");
const lowerFirst = (value: string) => value[0].toLowerCase() + value.slice(1);
const scalar = (field: FieldMetadata) => field.kind !== "image";
/** Link from a companion row to its base record; its relation alias is `record`. */
export const companionLink = "recordId";
const reservedExtensionNames = new Set([companionLink, "record", "id", "revision", "createdAt", "updatedAt", "createBy", "createByUser"]);

/**
 * List policy from Field options (`list`, `searchable`, `sortable`, `filterable`, `groupable`),
 * with conventions for undeclared options. A manifest `list` override still wins. The server
 * service validates and fixes the result; nothing here comes from the browser.
 */
export function derivedListPolicy(metadata: Readonly<Record<string, FieldMetadata>>, override: Partial<ModelListPolicy> = {}): ModelListPolicy {
  const visible = Object.entries(metadata).filter(([, field]) => !field.sensitive);
  const fields = override.fields ?? visible.filter(([, field]) => field.list ?? true).slice(0, 12).map(([name]) => name);
  const published = (name: string) => fields.includes(name);
  for (const [name, field] of visible) {
    if (!published(name) && (field.searchable || field.sortable || field.filterable || field.groupable)) throw new Error(`${name}: un campo fuera de la lista no puede buscarse, ordenarse, filtrarse ni agruparse. Quita list: false o esas opciones.`);
  }
  for (const capability of ["searchFields", "sortable", "filterable", "groupable"] as const) {
    if (override[capability]?.some(name => metadata[name]?.readOnly)) throw new Error(`Los campos related son de lectura: no se permiten en ${capability}.`);
  }
  const texts = visible.filter(([name, field]) => field.kind === "text" && !field.readOnly && published(name)).map(([name]) => name);
  const declaredSearch = visible.some(([, field]) => field.searchable !== undefined);
  const pick = (test: (field: FieldMetadata) => boolean) => visible.filter(([name, field]) => published(name) && !field.readOnly && test(field)).map(([name]) => name);
  return {
    fields,
    searchFields: override.searchFields ?? (declaredSearch ? pick(field => field.searchable === true) : texts.includes("name") ? ["name"] : texts.slice(0, 1)),
    sortable: override.sortable ?? pick(field => field.sortable ?? scalar(field)),
    filterable: override.filterable ?? pick(field => field.filterable ?? scalar(field)),
    groupable: override.groupable ?? pick(field => field.groupable ?? ["boolean", "selection", "many2one"].includes(field.kind)),
  };
}

function menuLabel(menu: ModuleMenu | undefined, modelKey: string) {
  for (const [label, value] of Object.entries(menu ?? {})) {
    if (value === modelKey) return label;
    if (typeof value === "object") for (const [child, target] of Object.entries(value)) if (target === modelKey) return child;
  }
  return modelKey[0].toUpperCase() + modelKey.slice(1);
}

/**
 * Compile one manifest model. The registry calls it again with the composed class when other
 * modules extend the model; `extensions` fields stay out of the list policy (phase 1: form only).
 */
export function compileModuleModel(id: string, modelKey: string, options: ModuleModelOptions, label: string, extensions: readonly ModelExtensionInfo[] = []): ModuleModel {
  const name = `${pascal(id)}${pascal(modelKey)}`;
  const contract = defineModel(options.model, { name, table: options.table ?? `${id}_${modelKey}` });
  const clientFields = Object.keys(contract.metadata);
  const extended = new Set(extensions.flatMap(extension => [...extension.fields, ...extension.computed]));
  const collectionMetadata = collectionFieldMetadata({
    fields: Object.fromEntries(Object.entries(contract.metadata as Readonly<Record<string, FieldMetadata>>).filter(([field]) => !extended.has(field))),
    preview: Object.fromEntries(Object.entries({ ...contract.relatedFields, ...contract.computedFields }).filter(([field]) => !extended.has(field)).map(([field, value]) => [field, value.metadata])),
    related: Object.keys(contract.relatedFields),
  });
  const list = derivedListPolicy(collectionMetadata, options.list);
  validateCollectionComputed(contract, list.fields.filter(field => Object.hasOwn(contract.computedFields, field)), list.fields);
  const kanban = compileKanbanConfig(options.kanban, contract.metadata, contract.actions, list.fields);
  const view = options.view ?? "list";
  if (!collectionViews.includes(view)) throw new Error(`${id}.${modelKey}: vista de lista inválida.`);
  for (const [kind, loader] of Object.entries(options.views ?? {})) {
    if (loader === undefined) continue;
    if (![...collectionViews, "form"].includes(kind) || (typeof loader !== "function" && !(kind !== "form" && loader === true))) throw new Error(`${id}.${modelKey}: registro de vista inválido: ${kind}.`);
  }
  const presentations = availableCollectionViews(view, options.views ?? {}, Boolean(kanban));
  return Object.freeze({
    id: `${id}.${modelKey}`, key: modelKey, module: id, route: `/erp/${id}/${modelKey}` as const,
    label, delegate: lowerFirst(name),
    contract, metadata: contract.metadata as Readonly<Record<string, FieldMetadata>>, clientFields, list, kanban: kanban?.field,
    ...(kanban?.transitions !== undefined ? {kanbanTransitions:kanban.transitions} : {}),
    view, collectionViews: presentations, defaultSort: options.defaultSort, views: options.views ?? {},
    declaration: options, extensions: Object.freeze([...extensions]),
  });
}

/**
 * Validate the `extends` declarations of a module and build one companion model per extension
 * with persistent fields: `<Module><Base><Key>` with a unique, required link to the base record
 * (deleted with it). The companion has no routes, menus, access or service of its own.
 */
function compileExtensions(spec: ModuleSpec): { extensions: ModuleExtension[]; companions: GenerationModel[] } {
  const { id } = spec;
  const extensions: ModuleExtension[] = [];
  const companions: GenerationModel[] = [];
  for (const [target, extension] of Object.entries(spec.extends ?? {})) {
    if (!modelIdPattern.test(target)) throw new Error(`${id}: extends usa identificadores <módulo>.<modelo>: ${target}.`);
    const [baseModule, baseKey] = target.split(".");
    if (baseModule === id) throw new Error(`${id}: un módulo no extiende sus propios modelos; decláralos directamente.`);
    if (!(spec.depends ?? []).includes(baseModule)) throw new Error(`${id}: declara depends: ["${baseModule}"] para extender ${target}.`);
    if (!isModelExtension(extension)) throw new Error(`${id}: ${target} debe declararse con extendModel(...).`);
    const fields = extensionFields(extension);
    const baseNames = declaredNames(extension.base);
    for (const [name, field] of Object.entries(fields)) {
      const where = `${id} → ${target}.${name}`;
      if (!/^[a-z][A-Za-z0-9]*$/.test(name) || reservedExtensionNames.has(name)) throw new Error(`${where}: nombre de campo inválido o reservado.`);
      if (baseNames.has(name)) throw new Error(`${where}: el modelo base ya declara ese nombre.`);
      const metadata = field.metadata;
      if (metadata.related) throw new Error(`${where}: las extensiones todavía no admiten campos related.`);
      if (metadata.kind === "image") throw new Error(`${where}: las extensiones todavía no admiten imágenes.`);
      if (metadata.sensitive || metadata.unique) throw new Error(`${where}: una extensión no declara campos sensitive ni unique.`);
      if (metadata.searchable || metadata.sortable || metadata.filterable || metadata.groupable) throw new Error(`${where}: los campos extendidos aún no se buscan, ordenan, filtran ni agrupan.`);
      if (!metadata.compute && metadata.required && metadata.defaultKind !== "literal") throw new Error(`${where}: un campo obligatorio de una extensión necesita default (los registros existentes no tienen valor).`);
    }
    const persistent = Object.keys(fields).filter(name => !fields[name].metadata.compute);
    const computed = Object.keys(fields).filter(name => fields[name].metadata.compute);
    // Phase 1: the companion table is what the module manager installs, owns and drops.
    if (!persistent.length) throw new Error(`${id}: la extensión de ${target} necesita al menos un campo persistente.`);
    let companion: ModuleExtension["companion"];
    {
      const name = `${pascal(id)}${pascal(baseModule)}${pascal(baseKey)}`;
      const table = `${id}_${baseModule}_${baseKey}`;
      const link = Fields.Many2one(`${pascal(baseModule)}${pascal(baseKey)}`, { label: "Registro", required: true, unique: true });
      // Internal policy: the companion row belongs to its base record and goes with it.
      const cascade = Object.freeze({ ...link, metadata: Object.freeze({ ...link.metadata, onDelete: "Cascade" as const }) }) as Field;
      const own = Object.fromEntries([[companionLink, cascade], ...persistent.map(field => [field, fields[field]])]);
      class Companion extends Model { constructor() { super(); Object.assign(this, own); } }
      const contract = defineModel(Companion, { name, table });
      companions.push({ model: contract, clientFields: Object.keys(contract.metadata) });
      companion = Object.freeze({ name, table, relation: `${lowerFirst(name)}${pascal(companionLink)}Records` });
    }
    extensions.push(Object.freeze({ target, module: id, label: spec.name, extension, fields: Object.freeze(persistent), computed: Object.freeze(computed), ...(companion ? { companion } : {}) }));
  }
  return { extensions, companions };
}

/** Trusted static declaration of a module: models, menu and conventions. Never exposed to the browser. */
export function defineModule(spec: ModuleSpec): ModuleDefinition {
  const id = spec.id;
  if (!/^[a-z][a-z0-9]*$/.test(id)) throw new Error(`Identificador de módulo inválido: ${id}. Usa minúsculas sin guiones.`);
  const entries = Object.entries(spec.models);
  const models: ModuleModel[] = entries.map(([modelKey, declaration]) => {
    if (!key.test(modelKey) || modelKey === "nuevo") throw new Error(`${id}: clave de modelo inválida o reservada: ${modelKey}.`);
    return compileModuleModel(id, modelKey, typeof declaration === "function" ? { model: declaration } : declaration, menuLabel(spec.menu, modelKey));
  });
  const { extensions, companions } = compileExtensions(spec);
  const inverses = new Set<string>();
  const children = new Set<string>();
  for (const parent of models) {
    const declarations = Object.entries(parent.contract.one2manyFields);
    if (declarations.length > 4) throw new Error(`${parent.id}: máximo cuatro relaciones One2many.`);
    for (const [name, field] of declarations) {
      const { target, inverse } = field.one2many;
      const child = models.find(model => model.contract.name === target);
      const foreign = child?.metadata[inverse];
      if (!child || child === parent || Object.keys(child.contract.one2manyFields).length || foreign?.kind !== "many2one" || foreign.target !== parent.contract.name || !foreign.required || foreign.unique || foreign.onDelete !== "Restrict" || Object.values(child.metadata).some(field => field.sensitive)) throw new Error(`${parent.id}.${name}: One2many requiere un hijo del mismo módulo sin líneas/sensitive y un Many2one inverso obligatorio, no único, con Restrict.`);
      const key = `${target}.${inverse}`;
      if (inverses.has(key)) throw new Error(`${key}: una inversa sólo puede pertenecer a una declaración One2many.`);
      inverses.add(key);
      if (children.has(target)) throw new Error(`${target}: un hijo sólo puede pertenecer a una relación One2many declarativa.`);
      children.add(target);
    }
  }
  const byKey = new Map(models.map(model => [model.key, model]));
  const access = declareAccess(id, spec, Object.fromEntries(models.map(model => [model.key, model.metadata])));
  // Without groups the module stays admin-only (superuser), as before access control existed.
  const grouped = access.groups.length > 0;
  const visibility = (groups: readonly string[]) => grouped ? { access: "authenticated" as const, groups } : { access: "admin" as const };
  const link = (label: string, target: string): ApplicationMenuLink => {
    const model = byKey.get(target);
    if (!model) throw new Error(`${id}: el menú «${label}» apunta a un modelo inexistente: ${target}.`);
    return { id: `${target}-list`, label, href: model.route, model: model.id, ...visibility(readGroups(access, model.id)) };
  };
  const menus: ApplicationMenu[] = Object.entries(spec.menu ?? Object.fromEntries(models.map(model => [model.label, model.key])))
    .map(([label, value]) => {
      if (typeof value === "string") return link(label, value);
      const items = Object.entries(value).map(([child, target]) => link(child, target));
      return { id: `${label.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "grupo"}-group`, label,
        ...visibility([...new Set(items.flatMap(item => item.groups ?? []))]), items };
    });
  if (typeof spec.icon !== "string" || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(spec.icon)) throw new Error(`${id}: usa el nombre de un icono Lucide, por ejemplo "flask-conical".`);
  const application = {
    id, name: spec.name, description: spec.description ?? `Aplicación ${spec.name}.`, version: spec.version ?? "0.1.0",
    ...visibility(access.groups.map(group => group.id)), depends: spec.depends ?? [], models: models.map(model => model.contract.name), accessModels: models.map(model => model.id), menus,
  };
  // Validate ids, menus and dependencies now; the icon component is attached by the registry.
  defineApplication({ ...application, icon: (() => null) as unknown as ApplicationManifest["icon"] });
  const profile: GenerationProfile = {
    module: { id, depends: spec.depends ?? [], models: [...models.map(model => ({ model: model.contract, clientFields: model.clientFields })), ...companions] },
    externalOwners: {}, runtime: true,
  };
  return Object.freeze({ id, application, icon: spec.icon, models: Object.freeze(models), profile, access, extensions: Object.freeze(extensions) });
}
