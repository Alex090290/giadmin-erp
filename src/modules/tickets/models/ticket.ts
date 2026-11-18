import "server-only";
import { Fields, Model, type DisplayRecord } from "@/lib/orm";

export class Ticket extends Model {
  name = Fields.Text({
    label: "Folio",
    sequence: {
      prefix: "TCK/{year}/",
      padding: 6,
      reset: "year",
    },
  });
  asunto = Fields.Text({
    label: "Asunto",
    required: true,
    maxLength: 160,
    tracking: true,
  });
  descripcion = Fields.Text({
    label: "Descripción",
    maxLength: 4000,
    list: false,
  });
  prioridad = Fields.Selection(
    [
      { value: "baja", label: "Baja" },
      { value: "normal", label: "Normal" },
      { value: "alta", label: "Alta" },
    ],
    {
      label: "Prioridad",
      required: true,
      default: "normal",
      tracking: true,
    },
  );
  estado = Fields.Selection(
    [
      { value: "nuevo", label: "Nuevo" },
      { value: "enProceso", label: "En proceso" },
      { value: "enEspera", label: "En espera" },
      { value: "resuelto", label: "Resuelto" },
      { value: "cerrado", label: "Cerrado" },
    ],
    {
      label: "Estado",
      required: true,
      default: "nuevo",
      tracking: true,
    },
  );
  estimacionMinutos = Fields.Integer({
    label: "Estimación (minutos)",
    required: true,
    min: 0,
    default: 0,
    tracking: true,
  });
  presupuestoMinutos = Fields.Integer({
    label: "Presupuesto (minutos)",
    required: true,
    min: 0,
    default: 120,
    tracking: true,
  });
  requiereVisita = Fields.Boolean({
    label: "Requiere visita",
    default: false,
    tracking: true,
  });
  active = Fields.Boolean({ label: "Activo", default: true, tracking: true });
  displayName(record: DisplayRecord<Ticket, "name">): string {
    return record.name;
  }
  // Define aquí normalize, beforeSave y afterSave cuando tu negocio lo necesite.
}
