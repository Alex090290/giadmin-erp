import { LoaderCircle } from "lucide-react";

/** Inline feedback: never creates a modal, moves focus or covers another view. */
export default function FormPendingStatus({ children, announce = true }: { children: string; announce?: boolean }) {
  return <span role={announce ? "status" : undefined} aria-live={announce ? "polite" : undefined} aria-hidden={!announce || undefined} className="inline-flex min-w-0 items-center gap-2 text-xs font-normal text-base-content/60">
    <LoaderCircle size={14} aria-hidden="true" className="shrink-0 animate-spin motion-reduce:animate-none" />{children}
  </span>;
}

/** Static placeholder preserves the form's frame while no editable record is available. */
export function FormLoadingState() {
  return <div className="card flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-base-300 bg-base-100 shadow-sm">
    <header className="shrink-0 rounded-t-2xl border-b border-base-300 bg-linear-to-r from-primary/5 to-transparent px-4 py-3 sm:px-6"><FormPendingStatus>Cargando registro…</FormPendingStatus></header>
    <div aria-busy="true" aria-hidden="true" className="min-h-0 flex-1 space-y-5 overflow-hidden p-3 sm:p-4"><div className="h-5 w-2/5 max-w-64 rounded bg-base-200" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{[1, 2, 3, 4].map(item => <div key={item} className="space-y-2"><div className="h-3 w-20 rounded bg-base-200" /><div className="h-9 rounded border border-base-200 bg-base-200/40" /></div>)}</div></div>
  </div>;
}
