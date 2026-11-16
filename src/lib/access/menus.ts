import type { ApplicationManifest } from "../applications/manifest";

/** Manifest identifiers cannot contain '/': this key is unambiguous across applications. */
export const menuPolicyKey = (applicationId: string, menuId: string) => `${applicationId}/${menuId}`;
export type MenuCatalogueEntry = { applicationId: string; applicationName: string; menuId: string; label: string; group: boolean; parentId: string | null };
export function describeApplicationMenus(applications: readonly Pick<ApplicationManifest, "id" | "name" | "menus">[]): MenuCatalogueEntry[] {
  return applications.flatMap(application => (application.menus ?? []).flatMap(item => {
    const entry = { applicationId: application.id, applicationName: application.name, menuId: item.id, label: item.label, group: "items" in item, parentId: null };
    return "items" in item ? [entry, ...item.items.map(child => ({ ...entry, menuId: child.id, label: `${item.label} / ${child.label}`, group: false, parentId: item.id }))] : [entry];
  }));
}
