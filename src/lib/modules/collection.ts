import type { Many2OneLoader } from "../many2one/model-lookup";
import { collectionFieldMetadata, type ModelClientConfig } from "./config";
import { modelColumns } from "../orm/presentation";
import type { ListColumn } from "../list/types";
import type { ListResult, ListState } from "../list/types";
import type { KanbanLoader, KanbanMover } from "../kanban/types";
import type { ListDeleteResult, ListDeleteTarget } from "../list/selection";

export type ModelColumn = Omit<Partial<ListColumn>, "field"> & { field: string };
/** Alternate providers retain the same paging contracts; applications authorize their server implementations. */
export type CollectionSource = {
  filterLookups?: Readonly<Record<string, Many2OneLoader>>;
  load: (state: ListState) => Promise<ListResult>;
  loadKanban?: KanbanLoader;
  move?: KanbanMover;
  remove?: (selection: readonly ListDeleteTarget[]) => Promise<ListDeleteResult>;
};

/** One published source contract; presentations never choose delegates, domains or arbitrary fields. */
export function modelCollection(config: ModelClientConfig, declared?: readonly ModelColumn[]) {
  const metadata = collectionFieldMetadata(config);
  const fields = Object.fromEntries(Object.entries(metadata).map(([name, metadata]) => [name, { metadata }]));
  const project = (columns: readonly ModelColumn[]) => modelColumns(fields, columns.map(column => {
    if (!config.list.fields.includes(column.field) || !Object.hasOwn(fields, column.field)) throw new Error(`${config.id}: la columna ${column.field} no está publicada en la política de lista del servidor.`);
    return {
      ...column,
      sortable: config.list.sortable.includes(column.field) && column.sortable !== false,
      filterable: config.list.filterable.includes(column.field) && column.filterable !== false,
      groupable: config.list.groupable.includes(column.field) && column.groupable !== false,
    };
  }));
  const publishedColumns = project(config.list.fields.map(field => ({ field })));
  const columns = declared ? project(declared) : publishedColumns;
  // Keep query support for omitted fields, while honoring explicit presentation restrictions.
  const overrides = new Map(columns.map(column => [column.field, column]));
  const queryColumns = publishedColumns.map(column => overrides.get(column.field) ?? column);
  const kanbanField = config.kanban ? metadata[config.kanban] : undefined;
  if (config.kanban && (kanbanField?.kind !== "selection" || !config.list.fields.includes(config.kanban))) throw new Error(`${config.id}: el tablero necesita un Selection publicado.`);
  return {
    columns,
    queryColumns,
    common: {
      model: config.name, searchFields: config.list.searchFields, defaultSort: config.defaultSort,
      createHref: `${config.route}/nuevo`, createLabel: "Nuevo", recordHref: `${config.route}/{id}`,
    },
    kanban: kanbanField?.kind === "selection" ? { groupField: config.kanban!, groups: kanbanField.choices, transitions: config.kanbanTransitions } : undefined,
  };
}
