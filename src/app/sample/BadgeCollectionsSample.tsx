"use client";

import { useState } from "react";
import ListView from "@/components/ui/list/ListView";
import CardView from "@/components/ui/card/CardView";
import KanbanView from "@/components/ui/kanban/KanbanView";
import ListCellValue from "@/components/ui/list/ListCellValue";
import { Fields } from "@/lib/orm/fields";
import { modelColumns } from "@/lib/orm/presentation";
import { createDemoRecords, demoGroups, demoPage } from "./collection-demo";

const fields = {
  name: Fields.Text({ label: "Proyecto" }),
  status: Fields.Selection(demoGroups, { label: "Estado", required: true }),
};
const badgeColumns = modelColumns(fields, [
  { field: "name", sortable: true },
  { field: "status", widget: "badge", colors: { todo: "info", progress: "warning", done: "success" }, filterable: true },
]);
const records = createDemoRecords().slice(0, 3).map((record, index) => ({ ...record, status: demoGroups[index].value }));
const fallbackColumn = { ...badgeColumns[1], colors: {} };

/** Public, in-memory examples using the same renderers as model-backed collections. */
export default function BadgeCollectionsSample() {
  const [textOnly, setTextOnly] = useState(false);
  const columns = textOnly ? badgeColumns.map(column => ({...column,widget:undefined})) : badgeColumns;
  return <section id="badge-collections" className="min-w-0 scroll-mt-6 space-y-4">
    <header><h2 className="text-xl font-semibold">Selection con colores</h2><p className="text-sm text-base-content/65">Con widget badge, colors define su color; sin widget colorea la fuente. Valores sin color: badge neutral o texto normal. Datos ficticios sin persistencia.</p></header>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" autoComplete="off" className="checkbox checkbox-sm" checked={textOnly} onChange={event => setTextOnly(event.target.checked)} />Sólo color del texto (sin widget)</label>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>Sin color configurado:</span><ListCellValue record={records[0]} column={{...fallbackColumn,widget:textOnly ? undefined : "badge"}} />
      <span>Valor desconocido:</span><ListCellValue record={{ id: "unknown", status: "otro" }} column={columns[1]} />
      <span>Sin valor:</span><ListCellValue record={{ id: "empty", status: null }} column={columns[1]} />
    </div>
    <ListView model="BadgeDemo" title="Estados en lista" columns={columns} searchFields={["name", "client"]} load={async state => demoPage(records, state)} create={false} delete={false} paramPrefix="badgeList" />
    <CardView model="BadgeDemo" title="Estados en tarjetas" columns={columns} searchFields={["name", "client"]} load={async state => demoPage(records, state)} paramPrefix="badgeCards" />
    <KanbanView model="BadgeDemo" title="Estados en kanban" columns={columns} searchFields={["name", "client"]} groupField="status" groups={demoGroups} load={async ({ state, group }) => demoPage(records, state, group)} paramPrefix="badgeBoard" className="h-[30rem]" />
  </section>;
}
