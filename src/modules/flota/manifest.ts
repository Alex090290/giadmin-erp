import { Vehicle } from "./models/vehicle";
import { Modelo } from "./models/modelo";
import { Fabricante } from "./models/fabricante";
import "server-only";
import { defineModule } from "@/lib/modules/define";

export default defineModule({
  id: "flota",
  name: "Flota",
  icon: "car",
  models: {
    fabricante: Fabricante,

    modelo: Modelo,

    vehicle: {
      model: Vehicle,
      kanban: {
        field: "estado",
        transitions: [
          { from: "disponible", to: "mantenimiento", action: "enviarMantenimiento" },
          { from: "mantenimiento", to: "disponible", action: "finalizarMantenimiento" },
        ],
      },
      views: {
        form: () => import("./views/VehicleForm"),
        list: () => import("./views/VehicleKanban"),
      },
    },
  },
  menu: {
    Vehículos: "vehicle",
    Configuración: {
      Fabricantes: "fabricante",
      Modelos: "modelo",
    },
  },

  groups: {
    consulta: "Consulta de flota",
    operador: {
      label: "Operador en flota",
      implies: ["consulta"],
    },
    responsable: {
      label: "Responsable de flota",
      implies: ["operador"],
    },
  },

  access: [
    {
      group: "consulta",
      models: ["vehicle", "fabricante", "modelo"],
      perms: "r",
    },
    {
      group: "operador",
      models: "vehicle",
      perms: "cru",
    },
  ],

  rules: [
    {
      id: "vehiculos-propios",
      label: "Mis vehículos",
      models: "vehicle",
      groups: ["operador"],
      domain: ({ actor }) => [
        {
          field: "createBy",
          operator: "eq",
          value: actor.id,
        },
      ],
    },
    {
      id: "vehiculos-todos",
      label: "Todos los vehículos",
      models: "vehicle",
      groups: ["responsable"],
      domain: [],
    },
  ],
});
