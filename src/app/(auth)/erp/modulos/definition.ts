import type { ApplicationManifest } from "@/lib/applications/manifest";

/** Icon-free metadata: usable by access services and development scripts. */
export const modulesDefinition = {
  id: "modulos",
  name: "Módulos",
  description: "Aplicaciones disponibles, instalación y dependencias.",
  version: "0.1.0",
  depends: [],
  access: "admin",
  models: [],
  menus: [{ id: "catalogo", label: "Módulos", href: "/erp/modulos" }],
} satisfies Omit<ApplicationManifest, "icon">;
