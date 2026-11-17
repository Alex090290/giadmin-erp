import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { modules as declared } from "@/modules";
import { AccessError } from "../auth/policy";
import type { ModelActor } from "../orm/context";
import { prisma } from "../prisma";
import { createModelService } from "../orm/service";
import { authorizeModel, userGroups } from "../access/engine";
import { allowsActionGroups, type CapabilityActor } from "../access/capabilities";
import { projectModelAccess } from "./access";
import { createModelImageSigner } from "../uploads/model-image.server";
import type { Many2OneLoader } from "../many2one/model-lookup";
import type { FieldMetadata } from "../orm/fields";
import type { ModelAction } from "../orm/model";
import { createRepository } from "./repository";
import { modelIdPattern, type ModelClientConfig } from "./config";
import type { ModuleDefinition, ModuleModel } from "./define";
import { composeModules } from "./compose";

// Extensions declared by other modules are composed onto their base models once, at load.
const modules = composeModules(declared);

const byModule = new Map<string, ModuleDefinition>();
const byModel = new Map<string, { module: ModuleDefinition; entry: ModuleModel }>();
const byPrismaName = new Map<string, ModuleModel>();
for (const definition of modules) {
  if (byModule.has(definition.id)) throw new Error(`Módulo duplicado: ${definition.id}`);
  byModule.set(definition.id, definition);
  for (const entry of definition.models) {
    byModel.set(entry.id, { module: definition, entry });
    byPrismaName.set(entry.contract.name, entry);
  }
}

/** Installed declarative modules. Icons are attached by the application registry (React-only code). */
export function installedModules(): readonly ModuleDefinition[] { return modules; }
export function getModule(id: string) { return byModule.get(id); }

/** Resolve only registered ids; any other value is rejected before touching services or Prisma. */
export function getModuleModel(id: unknown) {
  if (typeof id !== "string" || !modelIdPattern.test(id)) return undefined;
  return byModel.get(id);
}

type Service = ReturnType<typeof createModelService<Record<string, unknown>>>;
const services = new Map<string, Service>();
const operationActor = new AsyncLocalStorage<ModelActor>();

/** Run a service operation with its authenticated actor available to nested label lookups. */
export function withActor<T>(actor: ModelActor, operation: () => Promise<T>) {
  return operationActor.run(actor, operation);
}

export function modelService(id: string): Service {
  const cached = services.get(id);
  if (cached) return cached;
  const found = getModuleModel(id);
  if (!found) throw new Error("MODEL_NOT_FOUND");
  const { module, entry } = found;
  const relations: Record<string, Many2OneLoader> = {};
  for (const [field, target] of Object.entries(lookupTargets(entry))) {
    // Labels reuse the actor of the current list operation; the lookup revalidates it in its own transaction.
    if (entry.list.fields.includes(field)) relations[field] = async request => {
      const actor = operationActor.getStore();
      if (!actor) throw new AccessError("UNAUTHENTICATED");
      return modelService(target).lookup(prisma, actor, request);
    };
  }
  const service = createModelService(entry.contract, createRepository(entry, module.profile.module), {
    lines: Object.fromEntries(Object.entries(entry.contract.one2manyFields).map(([name, field]) => {
      const child = module.models.find(model => model.contract.name === field.one2many.target)!;
      return [name, { metadata: field.one2many, child: () => modelService(child.id).transaction }];
    })),
    owners: module.models.flatMap(parent => Object.values(parent.contract.one2manyFields).filter(field => field.one2many.target === entry.contract.name).map(field => ({ inverse: field.one2many.inverse, parent: () => modelService(parent.id).transaction }))),
    list: entry.list, audit: true, defaultSort: entry.defaultSort,
    // Group access and record rules, revalidated inside each service transaction.
    authorize: (tx, actor, operation) => authorizeModel(tx, actor, entry.id, operation),
    // Related records shown through displayName/related paths obey the target's read access and rules.
    relationAccess: (tx, actor) => async (target, ids) => {
      const related = byPrismaName.get(target);
      // Infrastructure/manual models (User, Partner) carry no module record rules.
      if (!related) return new Set(ids);
      let scope: Record<string, unknown> | undefined;
      try { scope = await authorizeModel(tx, actor, related.id, "read"); }
      catch (error) { if (error instanceof AccessError && error.code === "DENIED") return new Set<string>(); throw error; }
      if (!scope) return new Set(ids);
      const delegate = (tx as unknown as Record<string, { findMany(args: unknown): Promise<{ id: string }[]> }>)[related.delegate];
      const rows = await delegate.findMany({ where: { AND: [{ id: { in: [...ids] } }, scope] }, select: { id: true } });
      return new Set(rows.map(row => row.id));
    },
    // Actions with groups: superusers pass; others need one of the groups (local keys belong to this module).
    authorizeAction: async (tx, actor, action) => {
      const user = await tx.user.findUnique({ where: { id: actor.id }, select: { isAdmin: true } });
      if (user?.isAdmin) return;
      const groups = await userGroups(tx, actor.id);
      if (!allowsActionGroups({ isAdmin: false, groups }, module.id, action.groups)) throw new AccessError("DENIED");
    },
    ...(entry.kanban ? { kanban: { field: entry.kanban, ...(entry.kanbanTransitions !== undefined ? {transitions:entry.kanbanTransitions} : {}) } } : {}),
    ...(Object.keys(relations).length ? { relations } : {}),
  });
  services.set(id, service);
  return service;
}

/** Many2one fields whose target is a registered module model. Manual models (Partner, User) need their own provider. */
function lookupTargets(entry: ModuleModel): Record<string, string> {
  const targets: Record<string, string> = {};
  for (const [field, metadata] of Object.entries(entry.metadata)) {
    if (metadata.kind !== "many2one" || metadata.sensitive) continue;
    const target = byPrismaName.get(metadata.target);
    if (target) targets[field] = target.id;
  }
  return targets;
}

const signers = new Map<string, ReturnType<typeof createModelImageSigner>>();
export function imageSigner(id: string) {
  const found = getModuleModel(id);
  if (!found) throw new Error("MODEL_NOT_FOUND");
  let signer = signers.get(id);
  if (!signer) {
    const images = Object.entries(found.entry.metadata).filter(([, field]) => field.kind === "image" && !field.sensitive).map(([name]) => name);
    // Uploading needs create or write access. Session lookup is loaded on demand so the
    // registry stays usable outside Next (scripts, tests).
    const authorize = async () => {
      const actor = await (await import("../auth/access")).requireUser();
      await prisma.$transaction(async tx => {
        try { await authorizeModel(tx, actor, id, "write"); }
        catch (error) { if (error instanceof AccessError && error.code === "DENIED") await authorizeModel(tx, actor, id, "create"); else throw error; }
      });
    };
    signer = createModelImageSigner({ authorize }, { metadata: found.entry.metadata }, images);
    signers.set(id, signer);
  }
  return signer;
}

export function modelClientConfig(id: string, access?: CapabilityActor): ModelClientConfig {
  const found = getModuleModel(id);
  if (!found) throw new Error("MODEL_NOT_FOUND");
  const { module, entry } = found;
  const { contract } = entry;
  const published = (entry.contract.actions ?? []) as readonly ModelAction[];
  const config: ModelClientConfig = {
    id: entry.id, module: module.id, moduleName: module.application.name, key: entry.key, name: contract.name, label: entry.label, route: entry.route,
    fields: Object.fromEntries(entry.clientFields.map(name => [name, entry.metadata[name]])),
    preview: Object.fromEntries(Object.entries((contract.previewFields ?? {}) as Readonly<Record<string, { metadata: FieldMetadata }>>).map(([name, field]) => [name, field.metadata])),
    related: Object.keys(contract.relatedFields ?? {}),
    reactionRules: contract.reactionRules ?? [],
    lookups: lookupTargets(entry),
    lines: Object.fromEntries(Object.entries(contract.one2manyFields).map(([name, field]) => {
      const child = module.models.find(model => model.contract.name === field.one2many.target)!;
      return [name, {
        metadata: field.one2many, model: child.id,
        fields: Object.fromEntries(Object.entries(child.metadata).filter(([key]) => key !== field.one2many.inverse)),
        lookups: Object.fromEntries(Object.entries(lookupTargets(child)).filter(([key]) => key !== field.one2many.inverse)),
        capabilities: access?.modelAccess[child.id] ?? { read: false, create: false, write: false, unlink: false },
      }];
    })),
    // Names and labels only; the server validates the name and re-checks permissions on every call.
    actions: published.map(({ name, label }) => ({ name, label })),
    list: { fields: entry.list.fields, searchFields: entry.list.searchFields, sortable: entry.list.sortable ?? [], groupable: entry.list.groupable ?? [], filterable: entry.list.filterable ?? [] },
    view: entry.view,
    collectionViews: entry.collectionViews,
    // Plain JSON: omit absent options instead of sending undefined.
    ...(entry.kanban ? { kanban: entry.kanban } : {}),
    ...(entry.kanbanTransitions !== undefined ? {kanbanTransitions:entry.kanbanTransitions.map(({from,to})=>({from,to}))} : {}),
    ...(entry.defaultSort ? { defaultSort: entry.defaultSort } : {}),
    // Fields added by other modules, presented in their own group (names only).
    ...(entry.extensions.length ? { extensions: entry.extensions.map(extension => ({ module: extension.module, label: extension.label, fields: [...extension.fields, ...extension.computed] })) } : {}),
  };
  return access ? projectModelAccess(config, access, published, entry.kanbanTransitions) : config;
}
