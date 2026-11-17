import "server-only";
import type { LookupSelect } from "./display";

/**
 * Which of `ids` of the Prisma model `target` the current actor may read, decided by the
 * server's access engine inside the same transaction. Projections of related records that
 * are not allowed are masked as null (shown empty), never revealed.
 */
export type RelationAccess = (target: string, ids: readonly string[]) => Promise<ReadonlySet<string>>;

type Policy = Readonly<Record<string, readonly { readonly model?: string; readonly field?: string; readonly target?: string }[]>>;

/**
 * Map every relation prefix of the projected paths ("fabricante", "modelo.fabricante") to its
 * target model. `offset` skips leading guards that do not belong to the projected path (the
 * root relation of `related` groups, already resolved by ID).
 */
export function relationTargets(policy: Policy, offset = 0): ReadonlyMap<string, string> {
  const targets = new Map<string, string>();
  for (const [path, guards] of Object.entries(policy)) {
    const parts = path.split(".");
    for (let index = 0; index < parts.length - 1; index++) {
      const target = guards[index + offset]?.target;
      if (!target) throw new Error("La ruta relacionada no declara su modelo destino.");
      const prefix = parts.slice(0, index + 1).join(".");
      const known = targets.get(prefix);
      if (known && known !== target) throw new Error("La ruta relacionada es ambigua.");
      targets.set(prefix, target);
    }
  }
  return targets;
}

/** Nested relations also load their ID, so restricted records can be identified and masked. */
export function withRelationIds(select: LookupSelect): LookupSelect {
  return Object.fromEntries(Object.entries(select).map(([key, value]) =>
    [key, value === true ? true : { select: { ...withRelationIds(value.select), id: true } }]));
}

/** Null out (in place) every related object the actor cannot read; deeper hops go with it. */
export async function maskRelations(rows: readonly Record<string, unknown>[], targets: ReadonlyMap<string, string>, access?: RelationAccess): Promise<void> {
  if (!access || !targets.size || !rows.length) return;
  const prefixes = [...targets.keys()].sort((a, b) => a.split(".").length - b.split(".").length);
  for (const prefix of prefixes) {
    const parts = prefix.split(".");
    const key = parts[parts.length - 1];
    let parents: Record<string, unknown>[] = [...rows];
    for (const part of parts.slice(0, -1)) {
      parents = parents.flatMap(parent => {
        const child = Object.hasOwn(parent, part) ? parent[part] : null;
        return child && typeof child === "object" && !Array.isArray(child) ? [child as Record<string, unknown>] : [];
      });
    }
    const holders = parents.flatMap(parent => {
      const child = Object.hasOwn(parent, key) ? parent[key] : null;
      if (!child || typeof child !== "object" || Array.isArray(child)) return [];
      const id = (child as Record<string, unknown>).id;
      if (typeof id !== "string" || !id) throw new Error("La proyección relacionada necesita el ID del registro.");
      return [{ parent, id }];
    });
    if (!holders.length) continue;
    const allowed = await access(targets.get(prefix)!, [...new Set(holders.map(holder => holder.id))]);
    for (const holder of holders) if (!allowed.has(holder.id)) holder.parent[key] = null;
  }
}

/** Cache one decision per target model and ID for the duration of a single operation. */
export function cachedRelationAccess(resolve: RelationAccess): RelationAccess {
  const decided = new Map<string, Map<string, boolean>>();
  return async (target, ids) => {
    const known = decided.get(target) ?? new Map<string, boolean>();
    decided.set(target, known);
    const missing = ids.filter(id => !known.has(id));
    if (missing.length) {
      const allowed = await resolve(target, missing);
      for (const id of missing) known.set(id, allowed.has(id));
    }
    return new Set(ids.filter(id => known.get(id)));
  };
}
