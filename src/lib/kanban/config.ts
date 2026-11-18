import type { FieldMetadata } from "../orm/fields";
import type { KanbanConfig, KanbanTransition } from "./types";

/** Validate and snapshot local declarations, never data from a browser request. */
export function compileKanbanConfig(
  input: string | KanbanConfig | undefined,
  fields: Readonly<Record<string, FieldMetadata>>,
  actions: readonly { readonly name: string; readonly params?: object }[],
  published: readonly string[],
): KanbanConfig | undefined {
  if (input === undefined) return undefined;
  const config = typeof input === "string" ? { field: input } : input;
  if (!config || typeof config !== "object" || Array.isArray(config) ||
    Object.keys(config).some(key => key !== "field" && key !== "transitions") ||
    typeof config.field !== "string" || !Object.hasOwn(fields, config.field)) throw new Error("Configuración kanban inválida.");
  const metadata = fields[config.field];
  if (metadata.kind !== "selection" || !metadata.required || metadata.sensitive || metadata.readOnly || metadata.choices.length > 12 || !published.includes(config.field)) {
    throw new Error("Kanban requiere una Selection obligatoria, pública y publicada, con máximo 12 estados.");
  }
  if (config.transitions === undefined) return Object.freeze({field:config.field});
  if (!Array.isArray(config.transitions) || config.transitions.length > 132) throw new Error("Transiciones kanban inválidas.");
  const values = new Set(metadata.choices.map(choice => choice.value));
  const pairs = new Set<string>();
  const transitions = config.transitions.map((route): KanbanTransition => {
    if (!route || typeof route !== "object" || Array.isArray(route) ||
      Object.keys(route).length !== 3 || Object.keys(route).some(key => !["from", "to", "action"].includes(key)) ||
      typeof route.from !== "string" || typeof route.to !== "string" || typeof route.action !== "string" ||
      !values.has(route.from) || !values.has(route.to) || route.from === route.to ||
      !actions.some(action => action.name === route.action)) throw new Error("La transición kanban requiere estados distintos y una acción publicada.");
    if (actions.find(action => action.name === route.action)?.params) throw new Error("Las acciones con parámetros se ejecutan desde el formulario, no mediante una transición Kanban.");
    const pair = JSON.stringify([route.from, route.to]);
    if (pairs.has(pair)) throw new Error("Transición kanban duplicada.");
    pairs.add(pair);
    return Object.freeze({from:route.from,to:route.to,action:route.action});
  });
  return Object.freeze({field:config.field,transitions:Object.freeze(transitions)});
}
