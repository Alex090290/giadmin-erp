"use client";

import { useSearchParams } from "next/navigation";
import CollectionViews from "@/components/modules/CollectionViews";
import ModelCollection from "@/components/modules/ModelCollection";
import { selectedCollectionView, type ModelClientConfig } from "@/lib/modules/config";
import { computedCollectionFields, remainingField } from "./computed-collection.fields";
import { loadComputedCollection, loadComputedKanban } from "./computed-collection.actions";
const config: ModelClientConfig = {
  id: "sample.compute", module: "sample", moduleName: "Ejemplos", key: "compute", name: "ComputedCollectionDemo", label: "Cálculos en colecciones", route: "/sample",
  capabilities: { read: true, write: false, create: false, unlink: false, move: false },
  fields: Object.fromEntries(Object.entries(computedCollectionFields).map(([name, field]) => [name, field.metadata])),
  preview: { remainingKm: remainingField.metadata }, related: [], reactionRules: [], lookups: {}, actions: [],
  list: { fields: ["name", "amount", "status", "remainingKm"], searchFields: ["name"], sortable: ["name", "amount"], filterable: ["name", "amount", "status"], groupable: [] },
  view: "list", collectionViews: ["list", "card", "kanban"], kanban: "status", defaultSort: { field: "name", direction: "asc" },
};
const source = { load: loadComputedCollection, loadKanban: loadComputedKanban };
export default function ComputedCollectionSample() {
  const params = useSearchParams();
  const view = selectedCollectionView(params.get("computed_view"), config.collectionViews!, "list");
  return <section id="computed-collections" className="min-w-0 scroll-mt-6 space-y-3"><h2 className="text-xl font-semibold">Campos calculados en las tres presentaciones</h2><p className="text-sm text-base-content/65">Datos ficticios sin BD. El mismo método del modelo calcula en el servidor los kilómetros restantes para un servicio a los 20 000 km; negativos indican atraso. El valor calculado sólo se muestra, sin filtros, orden ni agrupación.</p><div className="flex h-[38rem] min-w-0 flex-col overflow-hidden rounded-xl border border-base-300"><CollectionViews views={config.collectionViews!} selected={view} paramPrefix="computed"><ModelCollection config={config} source={source} view={view} paramPrefix="computed" pageSize={6} create={false} delete={false} movable={false} open={false} /></CollectionViews></div></section>;
}
