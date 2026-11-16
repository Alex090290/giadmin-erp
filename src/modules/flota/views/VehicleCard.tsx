import ModelCollection from "@/components/modules/ModelCollection";
import type { ModelClientConfig } from "@/lib/modules/config";

export default function VehicleCard({ config }: { config: ModelClientConfig }) {
  return <ModelCollection config={config} view="card" columns={[
    { field: "fabricanteLogo", widget: "image" },
    { field: "name" },
    { field: "plate" },
    { field: "estado", widget: "badge", colors: { disponible: "success", mantenimiento: "warning" } },
  ]} />;
}
