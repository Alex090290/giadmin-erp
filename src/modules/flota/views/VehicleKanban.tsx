"use client";

import KanbanView from "@/components/ui/kanban/KanbanView";
import { modelKanban, modelMove } from "@/lib/modules/actions";
import {
  collectionFieldMetadata,
  type ModelClientConfig,
} from "@/lib/modules/config";
import { modelColumns } from "@/lib/orm/presentation";

export default function VehicleKanban({
  config,
}: {
  config: ModelClientConfig;
}) {
  const estado = config.fields.estado;

  if (estado?.kind !== "selection") {
    throw new Error("El tablero necesita el Selection estado.");
  }

  const fields = Object.fromEntries(
    Object.entries(collectionFieldMetadata(config)).map(([name, metadata]) => [
      name,
      { metadata },
    ]),
  );

  const columns = modelColumns(fields, [
    { field: "name" },
    { field: "plate" },
    {
      field: "estado",
      widget: "badge",
      colors: {
        disponible: "success",
        mantenimiento: "warning",
      },
    },
  ]).map((column) => ({
    ...column,
    sortable: config.list.sortable.includes(column.field),
    filterable: config.list.filterable.includes(column.field),
  }));

  return (
    <KanbanView
      model={config.name}
      title="Vehículos"
      columns={columns}
      searchFields={config.list.searchFields}
      defaultSort={config.defaultSort}
      groupField="estado"
      groups={estado.choices}
      load={modelKanban.bind(null, config.id)}
      transitions={config.kanbanTransitions}
      onMove={modelMove.bind(null, config.id)}
      recordHref={`${config.route}/{id}`}
      className="flex-1"
    />
  );
}
