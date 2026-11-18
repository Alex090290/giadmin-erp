import { Tecnico } from "./models/tecnico";
import { Categoria } from "./models/categoria";
import { Ticket } from "./models/ticket";
import "server-only";
import { defineModule } from "@/lib/modules/define";

export default defineModule({
  id: "tickets",
  name: "Tickets",
  icon: "hand-helping",
  models: {
    ticket: {
      model: Ticket,
      audit: true,
      views: {
        form: () => import("./views/TicketForm"),
        list: () => import("./views/TicketList"),
      },
    },

    categoria: Categoria,

    tecnico: Tecnico,
  },
  menu: {
    Tickets: "ticket",
    Configuración: {
      Categorías: "categoria",
      Técnicos: "tecnico",
    },
  },
});
