"use client";

import { useMemo, useRef, useState } from "react";
import type { ListState } from "@/lib/list/types";
import { useSearchParams } from "next/navigation";
import CollectionViews from "@/components/modules/CollectionViews";
import ModelCollection from "@/components/modules/ModelCollection";
import { Fields } from "@/lib/orm/fields";
import { selectedCollectionView, type ModelClientConfig } from "@/lib/modules/config";
import type { CollectionSource } from "@/lib/modules/collection";
import { createDemoRecords, demoPage } from "./collection-demo";

const fields = {
  name: Fields.Text({ label: "Proyecto", required: true }),
  client: Fields.Text({ label: "Cliente" }),
  status: Fields.Selection([{ value: "todo", label: "Por hacer" }, { value: "progress", label: "En curso" }, { value: "done", label: "Finalizado" }], { label: "Estado", required: true }),
};
const config: ModelClientConfig = {
  capabilities: { read: true, create: false, write: false, unlink: false, move: false },
  id: "sample.core", module: "sample", moduleName: "Ejemplos", key: "core", name: "CollectionCoreDemo", label: "Proyectos ficticios", route: "/sample",
  fields: Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.metadata])), preview: {}, related: [], reactionRules: [], lookups: {}, actions: [],
  list: { fields: ["name", "client", "status"], searchFields: ["name", "client"], sortable: ["name", "client", "status"], filterable: ["name", "client", "status"], groupable: [] },
  view: "list", collectionViews: ["list", "card", "kanban"], kanban: "status", defaultSort: { field: "name", direction: "asc" },
};
const rows = createDemoRecords();

export default function CollectionCoreSample() {
  const [scenario, setScenario] = useState("normal");
  const failNext = useRef(false);
  const source = useMemo<CollectionSource>(() => {
    async function load(state: ListState, group?: string) {
      if (scenario === "failure" && failNext.current && (!group || group === "todo")) {
        failNext.current = false;
        throw new Error("Fallo de conexión ficticio");
      }
      if (scenario === "slow" && state.query.toLowerCase() === "lento") {
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
      return demoPage(rows, state, group);
    }
    return { load: state => load(state), loadKanban: ({ group, state }) => load(state, group) };
  }, [scenario]);
  const params = useSearchParams();
  const view = selectedCollectionView(params.get("core_view"), config.collectionViews!, "list");
  return <section id="collection-core" aria-labelledby="collection-core-title" className="min-w-0 scroll-mt-6 space-y-4">
    <h2 id="collection-core-title" className="text-xl font-semibold">Una colección, tres presentaciones</h2>
    <p className="text-sm text-base-content/65">Misma fuente ficticia y política. Busca, filtra, ordena y cambia de vista; la URL conserva la consulta y reinicia la página. Sin BD, creación, eliminación ni movimientos.</p>
    <label className="flex flex-wrap items-center gap-2 text-sm">Prueba de carga
      <select aria-label="Escenario de carga" autoComplete="off" className="select select-sm w-auto" value={scenario} onChange={event => { failNext.current = true; setScenario(event.currentTarget.value); }}>
        <option value="normal">Normal</option><option value="failure">Fallo de conexión una vez</option><option value="slow">Respuesta lenta</option>
      </select>
    </label>
    <p className="text-xs text-base-content/60">El fallo afecta sólo a la próxima carga (en Kanban, Por hacer); Reintentar recupera esa consulta. En Respuesta lenta, busca «lento» y después otra palabra antes de 2,5 segundos: el resultado antiguo se descarta.</p>
    <div className="flex h-[42rem] min-w-0 flex-col overflow-hidden rounded-xl border border-base-300">
      <CollectionViews views={config.collectionViews!} selected={view} paramPrefix="core">
        <ModelCollection config={config} source={source} view={view} paramPrefix="core" pageSize={6} create={false} open={false} delete={false} movable={false} />
      </CollectionViews>
    </div>
  </section>;
}
