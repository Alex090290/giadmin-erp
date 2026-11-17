import "server-only";
import { compileModuleModel, type ModuleDefinition, type ModuleExtension, type ModuleModel } from "./define";

/**
 * Compose the extensions declared by registered modules onto their base models:
 * `Final = extB(extA(Base))`, ordered by dependency depth and then by module id, so the
 * result never depends on the order of src/modules/index.ts. Pure: no database access.
 */
export function composeModules(definitions: readonly ModuleDefinition[]): readonly ModuleDefinition[] {
  const byId = new Map(definitions.map(definition => [definition.id, definition]));
  const depth = (id: string, seen: readonly string[] = []): number => {
    if (seen.includes(id)) throw new Error(`Dependencias en ciclo: ${[...seen, id].join(" → ")}.`);
    const depends = byId.get(id)?.application.depends ?? [];
    return depends.length ? 1 + Math.max(...depends.map(next => depth(next, [...seen, id]))) : 0;
  };
  const byTarget = new Map<string, ModuleExtension[]>();
  for (const definition of definitions) {
    for (const extension of definition.extensions) {
      const [moduleId, key] = extension.target.split(".");
      const base = byId.get(moduleId);
      if (!base) throw new Error(`${definition.id}: extiende ${extension.target}, pero el módulo ${moduleId} no está registrado.`);
      const entry = base.models.find(model => model.key === key);
      if (!entry) throw new Error(`${definition.id}: el modelo ${extension.target} no existe.`);
      if (entry.declaration.model !== extension.extension.base) throw new Error(`${definition.id}: extendModel(...) de ${extension.target} debe recibir la clase registrada por ${moduleId}.`);
      if (base.models.some(parent => Object.values(parent.contract.one2manyFields).some(field => field.one2many.target === entry.contract.name))) throw new Error(`${definition.id}: ${extension.target} es línea One2many; extender líneas aún no está soportado.`);
      byTarget.set(extension.target, [...(byTarget.get(extension.target) ?? []), extension]);
    }
  }
  if (!byTarget.size) return definitions;
  const compose = (entry: ModuleModel): ModuleModel => {
    const extensions = byTarget.get(entry.id);
    if (!extensions) return entry;
    const ordered = [...extensions].sort((a, b) => depth(a.module) - depth(b.module) || a.module.localeCompare(b.module));
    const names = new Map<string, string>();
    for (const extension of ordered) for (const name of [...extension.fields, ...extension.computed]) {
      const owner = names.get(name);
      if (owner) throw new Error(`${entry.id}.${name}: lo declaran las extensiones de ${owner} y ${extension.module}.`);
      names.set(name, extension.module);
    }
    const model = ordered.reduce((current, extension) => extension.extension.apply(current), entry.declaration.model);
    return compileModuleModel(entry.module, entry.key, { ...entry.declaration, model }, entry.label, ordered.map(extension => Object.freeze({
      module: extension.module, label: extension.label, fields: extension.fields, computed: extension.computed,
      ...(extension.companion ? { relation: extension.companion.relation } : {}),
    })));
  };
  return Object.freeze(definitions.map(definition => {
    const models = definition.models.map(compose);
    return models.every((model, index) => model === definition.models[index]) ? definition : Object.freeze({ ...definition, models: Object.freeze(models) });
  }));
}
