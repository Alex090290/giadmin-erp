import "server-only";
import type { ComponentType } from "react";
import { availableCollectionViews, collectionFieldMetadata, collectionViews, type CollectionView, type ModelClientConfig } from "./config";
import { defineApplication, type ApplicationManifest, type ApplicationMenu, type ApplicationMenuLink } from "../applications/manifest";
import { defineModel, type Model } from "../orm/model";
import type { FieldMetadata } from "../orm/fields";
import { validateCollectionComputed } from "../orm/collection-computed";
import type { ModelListPolicy } from "../orm/service";
import type { GenerationProfile } from "../orm/generator/profile";
import type { ListViewConfig } from "../list/types";
import { declareAccess, readGroups, type AccessSpec, type ModuleAccess } from "../access/declare";
import { compileKanbanConfig } from "../kanban/config";
import type { KanbanConfig, KanbanTransition } from "../kanban/types";

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
  readonly menu?: ModuleMenu;
} & AccessSpec;

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
};

export type ModuleDefinition = {
  readonly id: string;
  /** Application metadata without the icon component (see registry). */
  readonly application: Omit<ApplicationManifest, "icon">;
  readonly icon: string;
  readonly models: readonly ModuleModel[];
  readonly profile: GenerationProfile;
  readonly access: ModuleAccess;
};

const key = /^[a-z][a-z0-9]*$/;
const pascal = (value: string) => value.split("-").map(part => part[0].toUpperCase() + part.slice(1)).join("");
const scalar = (field: FieldMetadata) => field.kind !== "image";

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

/** Trusted static declaration of a module: models, menu and conventions. Never exposed to the browser. */
export function defineModule(spec: ModuleSpec): ModuleDefinition {
  const id = spec.id;
  if (!/^[a-z][a-z0-9]*$/.test(id)) throw new Error(`Identificador de módulo inválido: ${id}. Usa minúsculas sin guiones.`);
  const entries = Object.entries(spec.models);
  const models: ModuleModel[] = entries.map(([modelKey, declaration]) => {
    if (!key.test(modelKey) || modelKey === "nuevo") throw new Error(`${id}: clave de modelo inválida o reservada: ${modelKey}.`);
    const options = typeof declaration === "function" ? { model: declaration } : declaration;
    const name = `${pascal(id)}${pascal(modelKey)}`;
    const contract = defineModel(options.model, { name, table: options.table ?? `${id}_${modelKey}` });
    const clientFields = Object.keys(contract.metadata);
    const collectionMetadata = collectionFieldMetadata({
      fields: contract.metadata,
      preview: Object.fromEntries(Object.entries({ ...contract.relatedFields, ...contract.computedFields }).map(([name, field]) => [name, field.metadata])),
      related: Object.keys(contract.relatedFields),
    });
    const list = derivedListPolicy(collectionMetadata, options.list);
    validateCollectionComputed(contract, list.fields.filter(name => Object.hasOwn(contract.computedFields, name)), list.fields);
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
      label: menuLabel(spec.menu, modelKey), delegate: name[0].toLowerCase() + name.slice(1),
      contract, metadata: contract.metadata as Readonly<Record<string, FieldMetadata>>, clientFields, list, kanban: kanban?.field,
      ...(kanban?.transitions !== undefined ? {kanbanTransitions:kanban.transitions} : {}),
      view, collectionViews: presentations, defaultSort: options.defaultSort, views: options.views ?? {},
    });
  });
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
    module: { id, depends: spec.depends ?? [], models: models.map(model => ({ model: model.contract, clientFields: model.clientFields })) },
    externalOwners: {}, runtime: true,
  };
  return Object.freeze({ id, application, icon: spec.icon, models: Object.freeze(models), profile, access });
}
