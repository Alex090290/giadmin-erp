"use client";
import type { Many2OneLoader } from "@/lib/many2one/model-lookup";
import type { ListFilter } from "@/lib/list/types";
import { filterOperatorLabels } from "@/lib/list/filters";
import { useMany2OneSearch } from "../form/useMany2OneSearch";

export default function RelationFilterLabel({ filter, load }: { filter: ListFilter; load: Many2OneLoader }) {
  const hasValue = filter.operator === "eq" || filter.operator === "neq";
  const result = useMany2OneSearch({ model: "partner", searchFields: [], displayName: "{id}", id: filter.value, pageSize: 1 }, hasValue && Boolean(filter.value), 0, load);
  return <>{filterOperatorLabels[filter.operator]}{hasValue ? `: ${result.data?.items.find(item => item.value === filter.value)?.label ?? "Registro seleccionado"}` : ""}</>;
}
