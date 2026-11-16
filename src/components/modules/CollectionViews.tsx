"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Columns3, LayoutGrid, List } from "lucide-react";
import type { ReactNode } from "react";
import { collectionViewHref, type CollectionView } from "@/lib/modules/config";

const labels = { list: "Lista", card: "Tarjetas", kanban: "Kanban" };
const icons = { list: List, card: LayoutGrid, kanban: Columns3 };

/** Select a registered lazy presentation while keeping the shared query URL. */
export default function CollectionViews({ views, selected, children, paramPrefix = "" }: { views: readonly CollectionView[]; selected: CollectionView; children: ReactNode; paramPrefix?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    {views.length > 1 && <nav aria-label="Presentación de la colección" className="flex shrink-0 flex-wrap justify-end gap-1 border-b border-base-300 px-2 py-1 sm:px-3">
      {views.map(view => {
        const Icon = icons[view];
        return <Link key={view} href={collectionViewHref(pathname, params.toString(), view, paramPrefix)} scroll={false} aria-current={selected === view ? "page" : undefined} className={`btn btn-sm gap-1.5 ${selected === view ? "btn-primary" : "btn-ghost"}`}><Icon size={16} aria-hidden="true" />{labels[view]}</Link>;
      })}
    </nav>}
    <div key={selected} className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
  </div>;
}
