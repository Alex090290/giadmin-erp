import ModelCollection from "@/components/modules/ModelCollection";
import type { ModelClientConfig } from "@/lib/modules/config";

/**
 * Vista expulsada con eject:view: ordena, renombra o quita columnas.
 * Sólo se aceptan campos publicados por la política de lista del servidor.
 */
export default function TicketList({ config }: { config: ModelClientConfig }) {
  return (
    <ModelCollection
      config={config}
      view="list"
      columns={[
        { field: "name" },
        { field: "categoriaId" },
        {
          field: "createByUser.partner.name",
          label: "Solicita",
          sortable: true,
          filterable: true,
          groupable: true,
        },
        { field: "prioridad" },
        {
          field: "estado",
          colors: {
            nuevo: "info",
            enProceso: "warning",
            enEspera: "primary",
            resuelto: "success",
            cerrado: "error",
          },
          widget: "badge",
        },
        { field: "estimacionMinutos" },
        { field: "presupuestoMinutos" },
        { field: "requiereVisita" },
        { field: "compromisoAt" },
      ]}
    />
  );
}
