import "server-only";
import { Fields, Model, type DisplayRecord } from "@/lib/orm";

export class Categoria extends Model {
  name = Fields.Text({
    label: "Nombre",
    required: true,
    maxLength: 120,
    tracking: true,
  });

  minutosRecomendados = Fields.Integer({
    label: "Minutos recomendados",
    required: true,
    min: 0,
    default: 0,
    tracking: true,
  });

  active = Fields.Boolean({ label: "Activo", default: true, tracking: true });
  displayName(record: DisplayRecord<Categoria, "name">): string {
    return record.name;
  }
  // Define aquí normalize, beforeSave y afterSave cuando tu negocio lo necesite.
}
