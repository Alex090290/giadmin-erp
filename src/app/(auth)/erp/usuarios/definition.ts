import type { ApplicationManifest } from "@/lib/applications/manifest";

/** Icon-free metadata: usable by access services and development scripts. */
export const usersDefinition = {
  id: "usuarios",
  name: "Usuarios",
  description: "Cuentas de acceso y permisos del ERP.",
  version: "0.1.0",
  depends: ["contactos"],
  access: "admin",
  models: ["User"],
  menus: [
    { id: "users", label: "Usuarios", href: "/erp/usuarios" },
  ],
} satisfies Omit<ApplicationManifest, "icon">;
