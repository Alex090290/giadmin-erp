import "server-only";
import { Fields, Model, ModelValidationError as Err, action, type DisplayRecord, type ModelContext, ActionRecord, constraint, depends, ReactionValues } from "@/lib/orm";

export class Vehicle extends Model {
  name = Fields.Text({
    label: "Nombre",
    required: false,
    maxLength: 300,
    tracking: true,
    searchable: true,
  });
  active = Fields.Boolean({ label: "Activo", default: true, tracking: true });

  plate = Fields.Text({
    label: "Matrícula",
    required: true,
    unique: true,
    maxLength: 20,
    tracking: true,
    searchable: true,
  });

  modeloId = Fields.Many2one("FlotaModelo", {
    label: "Modelo",
    required: true,
    onDelete: "Restrict",
    tracking: true,
  });

  fabricanteLogo = Fields.Image({
    label: "Fabricante",
    related: "modeloId.fabricanteId.logo",
  });

  estado = Fields.Selection(
    [
      { value: "disponible", label: "Disponible" },
      { value: "mantenimiento", label: "En mantenimiento" },
    ],
    {
      label: "Estado",
      required: true,
      default: "disponible",
      tracking: true,
    },
  );

  kilometraje = Fields.Integer({
    label: "Kilometraje",
    required: true,
    default: 0,
    min: 0,
    tracking: true,
  });

  proximoServicioKm = Fields.Integer({
    label: "Próximo servicio (km)",
    required: true,
    default: 20000,
    min: 0,
    tracking: true,
  });

  kilometrosRestantes = Fields.Integer({
    label: "Para servicio",
    compute: "calcularKilometrosRestantes",
  });

  @depends("proximoServicioKm", "kilometraje")
  calcularKilometrosRestantes(values: ReactionValues) {
    const objetivo = values.proximoServicioKm;
    const actual = values.kilometraje;

    return typeof objetivo === "number" && typeof actual === "number" ? objetivo - actual : null;
  }

  @action({ label: "Testing" })
  testing(record: ActionRecord<Vehicle>) {
    return {
      active: !record.active,
    };
  }

  @action({ label: "Enviar a mantenimiento", groups: ["operador"] })
  enviarMantenimiento(record: ActionRecord<Vehicle>) {
    if (record.estado !== "disponible") {
      throw new Err("Sólo puedes enviar vehículos disponibles a mantenimiento");
    }

    return { estado: "mantenimiento" as const };
  }

  @action({ label: "Finalizar mantenimiento", groups: ["operador"] })
  finalizarMantenimiento(record: ActionRecord<Vehicle>) {
    if (record.estado !== "mantenimiento") {
      throw new Err("El vehículo no está en mantenimiento");
    }

    return { estado: "disponible" as const, proximoServicioKm: record.kilometraje + 10000 };
  }

  normalize(values: Readonly<Record<string, unknown>>) {
    return {
      ...values,
      plate: typeof values.plate === "string" ? values.plate.trim().toUpperCase() : values.plate,
    };
  }

  @constraint("active", "estado")
  validarDesactivacion(values: Readonly<Record<string, unknown>>) {
    if (values.active === false && values.estado === "mantenimiento") {
      throw new Err("Finaliza el mantenimiento antes de desactivar el vehículo.", {
        active: "El vehículo sigue en mantenimiento",
      });
    }
  }

  async beforeSave(values: Record<string, unknown>, context: ModelContext) {
    const modeloId = values.modeloId;

    // VALIDA QUE KILOMETRAJE NO DISMINUYA
    const anterior = context.previous?.kilometraje;
    const nuevo = values.kilometraje;

    if (typeof anterior === "number" && typeof nuevo === "number" && nuevo < anterior) {
      throw new Err("El kilometraje no puede disminuir.", {
        kilometraje: `Debe ser mayor o igual a ${anterior}`,
      });
    }

    // SE VALIDA QUE ESTÉ SELECCIONADO UN MODELO
    if (typeof modeloId !== "string" || !modeloId) {
      throw new Err("Selecciona un modelo", {
        modeloId: "El modelo es obligatorio",
      });
    }

    // SE CONSULTA EL MODELO SELECCIONADO
    const modelo = await context.tx.flotaModelo.findUnique({
      where: { id: modeloId },
      select: {
        name: true,
        fabricante: {
          select: { name: true },
        },
      },
    });

    if (!modelo) {
      throw new Err("El modelo ya no existe.", {
        modeloId: "Selecciona otro modelo.",
      });
    }

    // SE FORMA EL NAME DEL MODELO
    return {
      ...values,
      name: `[${values.plate}] ${modelo.name} / ${modelo.fabricante.name}`,
    };
  }

  displayName(record: DisplayRecord<Vehicle, "name">): string {
    return record.name ?? "Nuevo vehículo";
  }
  // Define aquí normalize, beforeSave y afterSave cuando tu negocio lo necesite.
}
