import { Ticket } from "./models/ticket";
import "server-only";
import { defineModule } from "@/lib/modules/define";

export default defineModule({
  id: "tickets",
  name: "Tickets",
  icon: "boxes",
  models: {
    ticket: Ticket,
  },
});
