import "server-only";
import { Fields, Model, type DisplayRecord, constraint, ModelValidationError } from "@/lib/orm";

export class Mantenimiento extends Model {
  active = Fields.Boolean({ label: "Activo", default: true, tracking: true });
  name = Fields.Text({
    label: "Trabajo realizado",
    required: true,
    maxLength: 300,
    tracking: true,
  });

  vehicleId = Fields.Many2one("FlotaVehicle", {
    label: "Vehículo",
    required: true,
    onDelete: "Restrict",
    tracking: true,
  });

  fecha = Fields.DateTime({
    label: "Fecha del mantenimiento",
    required: true,
    tracking: true,
  });

  kilometraje = Fields.Integer({
    label: "Kilomegraje del servicio",
    required: true,
    min: 0,
    tracking: true,
  });

  displayName(record: DisplayRecord<Mantenimiento, "name">): string {
    return record.name;
  }

  // Define aquí normalize, beforeSave y afterSave cuando tu negocio lo necesite.

  @constraint("fecha")
  validarFecha(values: Readonly<Record<string, unknown>>) {
    const fecha = values.fecha;

    if (typeof fecha === "string" && Date.parse(fecha) > Date.now()) {
      throw new ModelValidationError("La fecha del mantenimiento no puede estar en el futuro.", {
        fecha: "Selecciona una fecha y hora anterior o igual a la actual",
      });
    }
  }
}
