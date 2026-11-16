import type { ApplicationManifest } from "@/lib/applications/manifest";

/** Icon-free metadata: usable by access services and development scripts. */
export const contactsDefinition = {
  id: "contactos",
  name: "Contactos",
  description: "Contactos compartidos de empresas, usuarios, clientes y proveedores.",
  version: "0.1.0",
  depends: [],
  access: "authenticated",
  models: ["Partner"],
  menus: [
    { id: "contacts", label: "Contactos", href: "/erp/contactos" },
  ],
} satisfies Omit<ApplicationManifest, "icon">;
