import ModelCollection from "@/components/modules/ModelCollection";
import type { ModelClientConfig } from "@/lib/modules/config";

/** The collection core supplies queries, groups, actions and navigation. */
export default function VehicleKanban({ config }: { config: ModelClientConfig }) {
  return <ModelCollection config={config} view="kanban" columns={[
    { field: "name" },
    { field: "plate" },
    { field: "estado", widget: "badge", colors: { disponible: "success", mantenimiento: "warning" } },
  ]} className="flex-1" />;
}
