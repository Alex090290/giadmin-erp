import type { ApplicationManifest } from "@/lib/applications/manifest";

/** Icon-free metadata: usable by access services and development scripts. */
export const accessDefinition = {
  id: "accesos",
  name: "Control de accesos",
  description: "Grupos, permisos por modelo y reglas de registro de los módulos.",
  version: "0.1.0",
  depends: ["usuarios"],
  access: "admin",
  models: [],
  menus: [
    { id: "grupos", label: "Grupos", href: "/erp/accesos" },
    { id: "modelos", label: "Modelos", href: "/erp/accesos/modelos" },
  ],
} satisfies Omit<ApplicationManifest, "icon">;
