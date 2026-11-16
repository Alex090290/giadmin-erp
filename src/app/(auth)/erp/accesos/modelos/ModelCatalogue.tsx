"use client";
import { useCallback } from "react";
import ListView from "@/components/ui/list/ListView";
import FormViewLoader from "@/components/ui/form/FormViewLoader";
import { accessModelsList, accessFieldsList, type AccessModelDescription } from "@/lib/access/model-catalogue.config";
import type { ListState } from "@/lib/list/types";
import { loadCatalogueModels, loadCatalogueModel, loadCatalogueFields } from "../actions";
import { accessManifest } from "../manifest";

const breadcrumbs = [{ label: "Aplicaciones", href: "/erp" }, { label: accessManifest.name, href: "/erp/accesos" }];
export default function ModelCatalogue() {
  return <ListView {...accessModelsList} title="Modelos" create={false} delete={false} load={loadCatalogueModels}
    breadcrumbs={[...breadcrumbs, { label: "Modelos" }]} recordHref="/erp/accesos/modelos/{id}"
    footer={<p>Modelos declarativos registrados. Abre uno para consultar sus campos. Catálogo de sólo lectura; las políticas por campo todavía no se configuran aquí.</p>} />;
}
export function ModelCatalogueDetail({ id }: { id: string }) {
  const load = useCallback(() => loadCatalogueModel(id), [id]);
  return <FormViewLoader recordKey={id} load={load}>{model => <ModelFields model={model} />}</FormViewLoader>;
}
function ModelFields({ model }: { model: AccessModelDescription }) {
  const load = useCallback((state: ListState) => loadCatalogueFields(model.id, state), [model.id]);
  return <ListView key={model.id} {...accessFieldsList} title={`Campos de ${model.label}`} create={false} delete={false} load={load}
    breadcrumbs={[...breadcrumbs, { label: "Modelos", href: "/erp/accesos/modelos" }, { label: model.label }]}
    headerActions={<span className="badge badge-ghost h-auto max-w-full py-1 wrap-anywhere">{model.id}</span>}
    footer={<div className="space-y-1"><p>{model.moduleName} · {model.name} · {model.fieldCount} campos declarados.</p><p>Tipos, relaciones y propiedades declaradas en código. «Sólo lectura» describe el campo; no es un permiso efectivo por usuario. No se muestran valores de registros ni metadatos técnicos de auditoría.</p></div>} />;
}
