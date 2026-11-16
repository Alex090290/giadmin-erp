import ModelCollection from "@/components/modules/ModelCollection";
import type { ModelClientConfig } from "@/lib/modules/config";

/**
 * Vista expulsada con eject:view: ordena, renombra o quita columnas.
 * Sólo se aceptan campos publicados por la política de lista del servidor.
 */
export default function FabricanteList({ config }: { config: ModelClientConfig }) {
  return <ModelCollection config={config} view="card" columns={[{ field: "logo", widget: "image" }, { field: "name" }, { field: "active" }]} />;
}
