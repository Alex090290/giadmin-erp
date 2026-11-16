import type { ListViewConfig } from "../list/types";

export const accessModelsList = {
  model: "access-model-catalogue", searchFields: ["label", "id", "moduleName", "name"],
  defaultSort: { field: "label", direction: "asc" },
  columns: [
    { field: "label", label: "Modelo", sortable: true, filterable: true },
    { field: "id", label: "Identificador", sortable: true, filterable: true },
    { field: "moduleName", label: "Aplicación", sortable: true, filterable: true },
    { field: "name", label: "Nombre del contrato", sortable: true, filterable: true },
    { field: "fieldCount", label: "Campos", type: "integer", sortable: true, align: "right" },
  ],
} as const satisfies ListViewConfig;

export const accessFieldsList = {
  model: "access-field-catalogue", searchFields: ["label", "name", "type", "origin", "target", "source"],
  defaultSort: { field: "name", direction: "asc" },
  columns: [
    { field: "label", label: "Campo", sortable: true, filterable: true },
    { field: "name", label: "Nombre técnico", sortable: true, filterable: true },
    { field: "type", label: "Tipo", sortable: true, filterable: true },
    { field: "origin", label: "Origen", sortable: true, filterable: true },
    { field: "target", label: "Modelo relacionado", sortable: true, filterable: true },
    { field: "source", label: "Ruta / inversa", sortable: true, filterable: true },
    { field: "required", label: "Obligatorio", type: "boolean" },
    { field: "readOnly", label: "Sólo lectura", type: "boolean" },
    { field: "sensitive", label: "Sensible", type: "boolean" },
  ],
} as const satisfies ListViewConfig;

export type AccessModelDescription = {
  id: string; label: string; name: string; module: string; moduleName: string; fieldCount: number;
};
export type AccessFieldDescription = {
  id: string; name: string; label: string; type: string; origin: string; target: string; source: string;
  required: boolean; readOnly: boolean; sensitive: boolean;
};
