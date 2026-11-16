import { Mantenimiento } from "./models/mantenimiento";
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
    fabricante: { model: Fabricante, views: { card: () => import("./views/FabricanteList") } },

    modelo: { model: Modelo, view: "card", views: { form: () => import("./views/ModeloForm"), list: true, card: () => import("./views/ModeloList") } },

    vehicle: {
      model: Vehicle,
      view: "kanban",
      kanban: {
        field: "estado",
        transitions: [
          { from: "disponible", to: "mantenimiento", action: "enviarMantenimiento" },
          { from: "mantenimiento", to: "disponible", action: "finalizarMantenimiento" },
        ],
      },
      views: {
        form: () => import("./views/VehicleForm"),
        list: () => import("./views/VehicleList"),
        kanban: () => import("./views/VehicleKanban"),
        card: () => import("./views/VehicleCard"),
      },
    },

    mantenimiento: Mantenimiento,
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
      models: ["vehicle", "fabricante", "modelo", "mantenimiento"],
      perms: "r",
    },
    {
      group: "operador",
      models: ["vehicle", "mantenimiento"],
      perms: "cru",
    },
    {
      group: "responsable",
      models: "mantenimiento",
      perms: "d",
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
