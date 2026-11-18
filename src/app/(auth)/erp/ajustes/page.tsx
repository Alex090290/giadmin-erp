import { redirect } from "next/navigation";

/** Ajustes opens on its first menu. */
export default function SettingsPage() {
  redirect("/erp/ajustes/usuarios");
}
