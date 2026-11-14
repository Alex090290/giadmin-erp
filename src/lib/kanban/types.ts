import type { ListRecord, ListResult, ListState } from "../list/types";

export type KanbanGroup = { value: string; label: string; tone?: "neutral" | "primary" | "info" | "success" | "warning" | "error" };
export type KanbanRequest = { group: string; state: ListState };
export type KanbanMove = { id: string; revision: string; from: string; to: string };
export type KanbanMoveResult = { ok: true } | { ok: false; kind?: "validation" | "server"; error: string };
export type KanbanLoader = (request: KanbanRequest) => Promise<ListResult>;
export type KanbanMover = (move: KanbanMove) => Promise<KanbanMoveResult>;
export type KanbanTransition = { readonly from: string; readonly to: string; readonly action: string };
/** Server-fixed transitions; absent preserves direct state changes, [] denies all changes. */
export type KanbanConfig = { readonly field: string; readonly transitions?: readonly KanbanTransition[] };
export type KanbanRoute = Pick<KanbanTransition, "from" | "to">;

/** UI hint only. The server independently checks its own configuration and permissions. */
export function canMoveKanban(from: string, to: string, transitions?: readonly KanbanRoute[]) {
  return from !== to && (transitions === undefined || transitions.some(route => route.from === from && route.to === to));
}

/** Merge incremental pages by identity; reset/refetch is required after a move or query change. */
export function mergeKanbanRows(previous: readonly ListRecord[], incoming: readonly ListRecord[]) {
  const rows = new Map(previous.map(record => [record.id, record]));
  for (const record of incoming) rows.set(record.id, record);
  return [...rows.values()];
}
