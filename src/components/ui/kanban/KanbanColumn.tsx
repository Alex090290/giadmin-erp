"use client";
import { useCallback, useEffect, useState } from "react";
import { useDraggable, useDroppable, useDndContext } from "@dnd-kit/core";
import { GripVertical, LoaderCircle, MoveRight } from "lucide-react";
import { readListValue, type ListPage, type ListRecord, type ListState, type ListResult } from "@/lib/list/types";
import { canMoveKanban, mergeKanbanRows, type KanbanGroup } from "@/lib/kanban/types";
import { useCollectionLoad } from "../collection/useCollectionLoad";
import RecordCard, { recordCardTitle } from "../collection/RecordCard";
import { CollectionMessage } from "../collection/CollectionShell";
import type { KanbanViewProps } from "./KanbanView";

const tones = { neutral: "bg-base-content/35", primary: "bg-primary", info: "bg-info", success: "bg-success", warning: "bg-warning", error: "bg-error" };
type ColumnProps = KanbanViewProps & { group: KanbanGroup; state: ListState; currentUrl: string; pending: string | null; move: (record: ListRecord, from: string, to: string) => void; registerHandle: (id: string, node: HTMLButtonElement | null) => void; onSettled: (group: string) => void };

function KanbanCard({ record, ...props }: Omit<ColumnProps, "state" | "load"> & { record: ListRecord }) {
  const validRevision = typeof record.revision === "string" && Boolean(record.revision);
  const disabled = !props.onMove || !validRevision || Boolean(props.pending) || !props.groups.some(group => canMoveKanban(props.group.value, group.value, props.transitions));
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useDraggable({ id: record.id, data: { record, group: props.group.value }, disabled });
  const title = recordCardTitle(record, props.titleField, props.columns);
  return <article ref={setNodeRef} className={`card min-w-0 rounded-xl border border-base-300 bg-base-100 shadow-xs transition-shadow hover:shadow-md motion-reduce:transition-none ${isDragging ? "opacity-30" : ""} ${props.pending === record.id ? "opacity-60" : ""}`} aria-busy={props.pending === record.id}>
    {props.onMove && <div className="flex items-center justify-between gap-2 px-3 pt-2"><button ref={node => { setActivatorNodeRef(node); props.registerHandle(record.id, node); }} type="button" {...attributes} {...listeners} disabled={disabled} className="btn btn-square btn-ghost btn-xs touch-none cursor-grab text-base-content/35 active:cursor-grabbing" aria-label={`Arrastrar ${title}`}><GripVertical size={16} aria-hidden="true" /></button><label className="flex min-w-0 items-center gap-1 text-xs text-base-content/50"><MoveRight size={12} aria-hidden="true" /><select autoComplete="off" className="select select-xs min-w-0 max-w-36 rounded-lg border-base-300" aria-label={`Mover ${title}`} value={props.group.value} disabled={disabled} onChange={event => props.move(record, props.group.value, event.currentTarget.value)}>{props.groups.map(group => <option key={group.value} value={group.value} disabled={group.value !== props.group.value && !canMoveKanban(props.group.value, group.value, props.transitions)}>{group.label}</option>)}</select></label></div>}
    <RecordCard {...props} record={record} />
    {props.pending === record.id && <span role="status" className="flex items-center gap-2 px-4 pb-3 text-xs text-primary"><LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Guardando movimiento…</span>}
  </article>;
}

export default function KanbanColumn(props: ColumnProps) {
  const { group, state, load, onSettled } = props;
  const scope = JSON.stringify({ group: group.value, state: { ...state, page: 1 }, groupField: props.groupField });
  const [pagination, setPagination] = useState({ scope, load, page: 1 });
  const page = pagination.scope === scope && pagination.load === load ? pagination.page : 1;
  const setPage = useCallback((page: number) => setPagination({ scope, load, page }), [scope, load]);
  const key = JSON.stringify({ group: group.value, state: { ...state, page } });
  const groupField = props.groupField;
  const request = useCallback(async (key: string) => {
    const input = JSON.parse(key);
    const result = await load(input);
    if (result.ok && result.data.rows.some(record => readListValue(record, groupField) !== input.group)) return { ok: false as const, error: "El proveedor devolvió tarjetas de otro estado." };
    return result;
  }, [load, groupField]);
  const merge = useCallback((previous: ListPage | null, incoming: ListPage): ListPage => ({
    ...incoming, rows: incoming.page === 1 ? incoming.rows : mergeKanbanRows(previous?.rows ?? [], incoming.rows),
  }), []);
  const onResult = useCallback((result: ListResult) => {
    if (result.ok && result.data.page !== page) setPage(result.data.page);
  }, [page, setPage]);
  const { data, error, loading, refresh } = useCollectionLoad(key, request, { scope, merge, onResult });
  const { active } = useDndContext();
  const origin = active?.data.current?.group;
  const { setNodeRef, isOver } = useDroppable({ id: group.value, disabled: !props.onMove || Boolean(props.pending) || (typeof origin === "string" && !canMoveKanban(origin, group.value, props.transitions)) });

  useEffect(() => { if (!loading) onSettled(group.value); }, [loading, onSettled, group.value]);
  return <section ref={setNodeRef} style={{ width: "min(20rem, calc(100vw - 5rem))" }} aria-label={`Columna ${group.label}`} className={`flex min-h-0 shrink-0 flex-col rounded-2xl border bg-base-200/60 transition-colors motion-reduce:transition-none sm:w-80 ${isOver ? "border-primary bg-primary/8 ring-2 ring-primary/20" : "border-base-300/70"}`}>
    <header className="flex shrink-0 items-center gap-2.5 border-b border-base-300/60 px-4 py-3.5"><span className={`size-2 shrink-0 rounded-full ${tones[group.tone ?? "neutral"]}`} aria-hidden="true" /><h3 className="min-w-0 flex-1 text-sm font-semibold wrap-anywhere">{group.label}</h3><span className="badge badge-sm badge-ghost tabular-nums" aria-label={`Total en ${group.label}`}>{data?.total ?? "…"}</span></header>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-busy={loading}>
      {!data && loading ? [1, 2].map(id => <div key={id} aria-hidden="true" className="skeleton h-36 rounded-xl motion-reduce:animate-none" />) : data?.rows.map(record => <KanbanCard key={record.id} {...props} record={record} />)}
      {!loading && !error && !data?.rows.length && <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-base-300 p-4 text-center text-xs leading-relaxed text-base-content/45">{props.onMove ? "Sin tarjetas. Puedes mover una aquí." : "Sin tarjetas en este estado."}</div>}
      {error && <CollectionMessage error={error} retry={refresh} />}
    </div>
    <footer className="flex shrink-0 flex-col gap-2 border-t border-base-300/60 p-3"><p role="status" className="text-center text-xs text-base-content/50 tabular-nums">{loading ? "Cargando tarjetas…" : data ? `${data.rows.length} de ${data.total}` : "Consulta no disponible"}</p>{data && data.rows.length < data.total && !error && <button type="button" className="btn btn-ghost btn-sm w-full" disabled={loading || Boolean(props.pending)} onClick={() => setPage(page + 1)}>Cargar más<span className="sr-only"> en {group.label}</span></button>}</footer>
  </section>;
}
