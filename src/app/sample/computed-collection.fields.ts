import { Fields } from "@/lib/orm/fields";
import { demoGroups } from "./collection-demo";

export const computedCollectionFields = {
  name: Fields.Text({ label: "Vehículo ficticio", required: true }),
  amount: Fields.Integer({ label: "Kilometraje", required: true }),
  status: Fields.Selection(demoGroups, { label: "Estado", required: true }),
};
export const remainingField = Fields.Integer({ label: "Km hasta servicio de 20 000", compute: "remaining" });
