import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { ModelValidationError } from "../orm/context";
import { describeApplicationMenus, menuPolicyKey, type MenuCatalogueEntry } from "./menus";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { modules } from "@/modules";
import { AccessError } from "../auth/policy";
import type { ModelActor } from "../orm/context";
import { accessCatalog, closeGroups } from "./engine";
import { accessOperations, type AccessPerms } from "./declare";

/** Administration of access control. Every function revalidates an active superuser inside its transaction. */
export async function assertAccessAdmin(tx: Prisma.TransactionClient, actor: ModelActor) {
  const user = await tx.user.findUnique({ where: { id: actor.id }, select: { active: true, isAdmin: true, sessionVersion: true } });
  if (!user?.active || user.sessionVersion !== actor.sessionVersion) throw new AccessError("UNAUTHENTICATED");
  if (!user.isAdmin) throw new AccessError("FORBIDDEN");
}
const none: AccessPerms = { read: false, create: false, write: false, unlink: false };
const same = (a: AccessPerms, b: AccessPerms) => accessOperations.every(operation => a[operation] === b[operation]);

export function knownGroup(groupId: unknown) {
  return typeof groupId === "string" ? accessCatalog().groups.get(groupId) : undefined;
}

export async function accessOverview(prisma: PrismaClient, actor: ModelActor) {
  return prisma.$transaction(async tx => {
    await assertAccessAdmin(tx, actor);
    const counts = await tx.accessUserGroup.groupBy({ by: ["groupId"], _count: { _all: true } });
    return modules.filter(definition => definition.access.groups.length).map(definition => ({
      id: definition.id, name: definition.application.name,
      groups: definition.access.groups.map(group => ({
        id: group.id, label: group.label,
        implies: group.implies.map(id => accessCatalog().groups.get(id)?.label ?? id),
        members: counts.find(row => row.groupId === group.id)?._count._all ?? 0,
      })),
    }));
  }, { isolationLevel: "RepeatableRead" });
}

export async function groupDetail(prisma: PrismaClient, actor: ModelActor, groupId: string) {
  const group = knownGroup(groupId);
  if (!group) return null;
  return prisma.$transaction(async tx => {
    await assertAccessAdmin(tx, actor);
    const catalog = accessCatalog();
    const [users, members, overrides, states] = await Promise.all([
      tx.user.findMany({ select: { id: true, login: true, active: true, isAdmin: true, partner: { select: { name: true } } }, orderBy: { login: "asc" } }),
      tx.accessUserGroup.findMany({ where: { groupId }, select: { userId: true } }),
      tx.accessModelOverride.findMany({ where: { groupId } }),
      tx.accessRuleState.findMany(),
    ]);
    const menuSettings = await readMenuSettings(tx, groupId);
    const memberIds = new Set(members.map(row => row.userId));
    const models = modules.flatMap(definition => definition.models.map(model => {
      const defaults = catalog.grants.get(model.id)?.find(grant => grant.group === groupId)?.perms ?? none;
      const override = overrides.find(row => row.model === model.id);
      const perms = override ? { read: override.read, create: override.create, write: override.write, unlink: override.unlink } : defaults;
      return { id: model.id, label: `${definition.application.name} · ${model.label}`, defaults, perms, overridden: Boolean(override) };
    }));
    // Rules of this group, plus global rules of the models it can access.
    const reachable = new Set(models.filter(model => accessOperations.some(operation => model.perms[operation])).map(model => model.id));
    const rules = modules.flatMap(definition => definition.access.rules)
      .filter(rule => rule.groups ? rule.groups.includes(groupId) : rule.models.some(model => reachable.has(model)))
      .map(rule => ({ id: rule.id, label: rule.label, scope: rule.groups ? "grupo" as const : "global" as const, models: rule.models, operations: rule.operations, active: states.find(state => state.ruleId === rule.id)?.active ?? true }));
    return {
      group: { id: group.id, label: group.label, module: group.module, implies: group.implies.map(id => catalog.groups.get(id)?.label ?? id) },
      users: users.map(user => ({ id: user.id, login: user.login, name: user.partner?.name ?? user.login, active: user.active, isAdmin: user.isAdmin, member: memberIds.has(user.id) })),
      models, rules, ...menuSettings,
    };
  }, { isolationLevel: "RepeatableRead" });
}

export async function setGroupMembers(prisma: PrismaClient, actor: ModelActor, groupId: string, userIds: readonly string[]) {
  if (!knownGroup(groupId)) throw new AccessError("DENIED");
  const wanted = new Set(userIds);
  await prisma.$transaction(async tx => {
    await assertAccessAdmin(tx, actor);
    const existing = await tx.user.count({ where: { id: { in: [...wanted] } } });
    if (existing !== wanted.size) throw new Error("Usuario inexistente.");
    await tx.accessUserGroup.deleteMany({ where: { groupId, userId: { notIn: [...wanted] } } });
    await tx.accessUserGroup.createMany({ data: [...wanted].map(userId => ({ userId, groupId })), skipDuplicates: true });
  }, { isolationLevel: "Serializable" });
}

/** Store only differences from the code defaults; matching the defaults removes the override. */
export async function setModelAccess(prisma: PrismaClient, actor: ModelActor, groupId: string, changes: ReadonlyMap<string, AccessPerms>) {
  if (!knownGroup(groupId)) throw new AccessError("DENIED");
  const catalog = accessCatalog();
  for (const model of changes.keys()) if (!catalog.models.has(model)) throw new Error("Modelo inexistente.");
  await prisma.$transaction(async tx => {
    await assertAccessAdmin(tx, actor);
    for (const [model, perms] of changes) {
      const defaults = catalog.grants.get(model)?.find(grant => grant.group === groupId)?.perms ?? none;
      if (same(perms, defaults)) await tx.accessModelOverride.deleteMany({ where: { groupId, model } });
      else await tx.accessModelOverride.upsert({ where: { groupId_model: { groupId, model } }, create: { groupId, model, ...perms }, update: perms });
    }
  }, { isolationLevel: "Serializable" });
}

/** Rules are active by default; only deactivations are stored. */
export async function setRulesActive(prisma: PrismaClient, actor: ModelActor, states: ReadonlyMap<string, boolean>) {
  const rules = new Set(modules.flatMap(definition => definition.access.rules.map(rule => rule.id)));
  for (const id of states.keys()) if (!rules.has(id)) throw new Error("Regla inexistente.");
  await prisma.$transaction(async tx => {
    await assertAccessAdmin(tx, actor);
    for (const [ruleId, active] of states) {
      if (active) await tx.accessRuleState.deleteMany({ where: { ruleId } });
      else await tx.accessRuleState.upsert({ where: { ruleId }, create: { ruleId, active }, update: { active } });
    }
  }, { isolationLevel: "Serializable" });
}


type HiddenMenuRow = { groupId: string; applicationId: string; menuId: string; updatedAt: Date };
function menuRevision(groupId: string, groups: ReadonlySet<string>, catalogue: readonly MenuCatalogueEntry[], hidden: readonly HiddenMenuRow[]) {
  return createHash("sha256").update(JSON.stringify({
    groupId, groups: [...groups].sort(), catalogue: catalogue.map(menu => [menuPolicyKey(menu.applicationId, menu.menuId), menu.parentId, menu.group]).sort(),
    hidden: hidden.map(row => [row.groupId, row.applicationId, row.menuId, row.updatedAt.toISOString()]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  })).digest("hex");
}
async function menuCatalogue() {
  // Use the same native/module metadata without importing icons into react-server scripts.
  const { coreApplicationDefinitions } = await import("../applications/core-definitions");
  return describeApplicationMenus([...coreApplicationDefinitions, ...modules.filter(module => module.models.length).map(module => module.application)]);
}
async function readMenuSettings(tx: Prisma.TransactionClient, groupId: string) {
  const groups = closeGroups([groupId]);
  const catalogue = await menuCatalogue();
  const hidden = await tx.accessMenuHidden.findMany({ where: { groupId: { in: [...groups] } } });
  return {
    menuRevision: menuRevision(groupId, groups, catalogue, hidden),
    menus: catalogue.map(menu => ({ ...menu,
      hidden: hidden.some(row => row.groupId === groupId && row.applicationId === menu.applicationId && row.menuId === menu.menuId),
      inherited: hidden.filter(row => row.groupId !== groupId && row.applicationId === menu.applicationId && (row.menuId === menu.menuId || row.menuId === menu.parentId))
        .map(row => accessCatalog().groups.get(row.groupId)?.label ?? row.groupId),
    })),
  };
}
const menuChangesSchema = z.strictObject({
  groupId: z.string().min(1).max(120), revision: z.string().regex(/^[a-f0-9]{64}$/),
  changes: z.array(z.strictObject({ applicationId: z.string().min(1).max(120), menuId: z.string().min(1).max(120), mode: z.enum(["default", "hidden"]) })).max(2000)
    .refine(changes => new Set(changes.map(menu => menuPolicyKey(menu.applicationId, menu.menuId))).size === changes.length, "Menús duplicados."),
});
/** Only restrictions, with a revision check; no request can grant menu/model access. */
export async function setMenuVisibility(prisma: PrismaClient, actor: ModelActor, input: unknown) {
  await prisma.$transaction(async tx => {
    await assertAccessAdmin(tx, actor);
    const { groupId, revision, changes } = menuChangesSchema.parse(input);
    if (!knownGroup(groupId)) throw new AccessError("DENIED");
    const current = await readMenuSettings(tx, groupId);
    if (current.menuRevision !== revision) throw new ModelValidationError("La configuración de menús cambió. Recarga el grupo antes de guardar.");
    const known = new Set(current.menus.map(menu => menuPolicyKey(menu.applicationId, menu.menuId)));
    for (const menu of changes) if (!known.has(menuPolicyKey(menu.applicationId, menu.menuId))) throw new ModelValidationError("Uno de los menús ya no está registrado. Recarga el grupo.");
    for (const menu of changes) {
      const key = { groupId, applicationId: menu.applicationId, menuId: menu.menuId };
      if (menu.mode === "hidden") await tx.accessMenuHidden.upsert({ where: { groupId_applicationId_menuId: key }, create: key, update: {} });
      else await tx.accessMenuHidden.deleteMany({ where: key });
    }
  }, { isolationLevel: "Serializable" });
}
