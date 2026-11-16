"use server";

import { createQueryActions } from "@/lib/orm/query-actions";
import { listAccessModels, readAccessModel, listAccessFields } from "@/lib/access/model-catalogue";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/access";
import { ModelValidationError } from "@/lib/orm/context";
import { AccessError } from "@/lib/auth/policy";
import { prisma } from "@/lib/prisma";
import { setGroupMembers, setModelAccess, setRulesActive, setMenuVisibility } from "@/lib/access/admin";
import { accessOperations, type AccessPerms } from "@/lib/access/declare";

export type AccessActionState = { ok: boolean; message: string } | null;
const failure = (error: unknown, fallback: string): AccessActionState => ({ ok: false, message: error instanceof AccessError ? error.message : fallback });
const text = (value: FormDataEntryValue | null) => typeof value === "string" ? value : "";
const done = (message: string): AccessActionState => { revalidatePath("/erp", "layout"); return { ok: true, message }; };

export async function saveMembers(_state: AccessActionState, form: FormData): Promise<AccessActionState> {
  try {
    const users = form.getAll("user").map(text);
    if (users.length > 1000 || users.some(id => !id || id.length > 100)) throw new Error("Selección inválida.");
    await setGroupMembers(prisma, await requireAdmin(), text(form.get("group")), users);
    return done("Miembros guardados.");
  } catch (error) { return failure(error, "No se pudieron guardar los miembros."); }
}

/** Every listed model is posted; unchecked boxes mean no permission. Matching the defaults removes the override. */
export async function saveModelAccess(_state: AccessActionState, form: FormData): Promise<AccessActionState> {
  try {
    const models = form.getAll("model").map(text);
    if (models.length > 500) throw new Error("Selección inválida.");
    const changes = new Map<string, AccessPerms>(models.map(model => [model, Object.fromEntries(accessOperations.map(operation => [operation, form.get(`${model}|${operation}`) === "on"])) as AccessPerms]));
    await setModelAccess(prisma, await requireAdmin(), text(form.get("group")), changes);
    return done("Permisos guardados.");
  } catch (error) { return failure(error, "No se pudieron guardar los permisos."); }
}

export async function saveRules(_state: AccessActionState, form: FormData): Promise<AccessActionState> {
  try {
    const rules = form.getAll("rule").map(text);
    if (rules.length > 500) throw new Error("Selección inválida.");
    await setRulesActive(prisma, await requireAdmin(), new Map(rules.map(rule => [rule, form.get(`active|${rule}`) === "on"])));
    return done("Reglas guardadas.");
  } catch (error) { return failure(error, "No se pudieron guardar las reglas."); }
}


/** Read-only metadata catalogue; the service revalidates admin in its transaction. */
const catalogueQueries = createQueryActions({ prisma, authorize: requireAdmin, error: "No se pudo consultar el catálogo de modelos." }, {
  models: listAccessModels, model: readAccessModel, fields: listAccessFields,
});
export async function loadCatalogueModels(state: unknown) { return catalogueQueries.models(state); }
export async function loadCatalogueModel(id: unknown) { return catalogueQueries.model(id); }
export async function loadCatalogueFields(id: unknown, state: unknown) { return catalogueQueries.fields({ id, state }); }


export async function saveMenuVisibility(_state: AccessActionState, form: FormData): Promise<AccessActionState> {
  try {
    const keys = form.getAll("menu").map(text);
    if (keys.length > 2000 || new Set(keys).size !== keys.length) throw new Error("Selección inválida.");
    const changes = keys.map(key => {
      const parts = key.split("/");
      if (parts.length !== 2) throw new Error("Menú inválido.");
      return { applicationId: parts[0], menuId: parts[1], mode: text(form.get(`visibility|${key}`)) };
    });
    await setMenuVisibility(prisma, await requireAdmin(), { groupId: text(form.get("group")), revision: text(form.get("revision")), changes });
    return done("Visibilidad de menús guardada.");
  } catch (error) {
    return error instanceof ModelValidationError ? { ok: false, message: error.message } : failure(error, "No se pudo guardar la visibilidad de menús.");
  }
}
