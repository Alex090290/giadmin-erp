"use client";
import ListView from "@/components/ui/list/ListView";
import type { Many2OneLoader } from "@/lib/many2one/model-lookup";
import type { ListResult, ListState } from "@/lib/list/types";

const options = [{ value: "model-1", label: "Toyota / Corolla" }, { value: "model-2", label: "Honda / Civic" }];
const rows = [{ id: "vehicle-1", name: "Vehículo A", modeloId: "model-1" }, { id: "vehicle-2", name: "Vehículo B", modeloId: "model-2" }, { id: "vehicle-3", name: "Sin modelo", modeloId: null }];
const lookup: Many2OneLoader = async request => {
  const filtered = options.filter(item => (!request.id || item.value === request.id) && (!request.query || item.label.toLowerCase().includes(request.query.toLowerCase())));
  return { ok: true, items: filtered.map(item => ({ ...item, record: { id: item.value } })), total: filtered.length, page: 1, pageSize: 5 };
};
const filterLookups = { modeloId: lookup };
async function load(state: ListState): Promise<ListResult> {
  const filtered = rows.filter(row => state.filters.every(filter => filter.field !== "modeloId" || (filter.operator === "eq" ? row.modeloId === filter.value : filter.operator === "neq" ? row.modeloId !== null && row.modeloId !== filter.value : filter.operator === "empty" ? row.modeloId === null : row.modeloId !== null)));
  return { ok: true, data: { rows: filtered.map(row => ({ ...row, $labels: { modeloId: row.modeloId ? { value: row.modeloId, label: options.find(option => option.value === row.modeloId)!.label } : null } })), total: filtered.length, page: 1, pageSize: 10 } };
}
export default function RelationFilterSample() {
  return <section id="relation-filter" className="space-y-3 scroll-mt-6"><h2 className="text-xl font-semibold">Filtrar una relación por selección</h2><p className="text-sm">En Modelo, busca «Corolla», selecciónalo y aplica el filtro. La URL guarda model-1, no el nombre visible. Ejemplo ficticio sin BD.</p><div className="h-[30rem] overflow-hidden rounded-xl border border-base-300"><ListView model="RelationFilterDemo" title="Vehículos ficticios" load={load} filterLookups={filterLookups} columns={[{ field: "name", label: "Vehículo", filterable: false }, { field: "modeloId", label: "Modelo", widget: "many2one" }]} searchFields={[]} paramPrefix="relation" delete={false} /></div></section>;
}
