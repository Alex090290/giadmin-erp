import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ModelCollection from "@/components/modules/ModelCollection";
import ModelForm from "@/components/modules/ModelForm";
import CollectionViews from "@/components/modules/CollectionViews";
import { selectedCollectionView } from "@/lib/modules/config";
import { getModule, getModuleModel, modelClientConfig } from "@/lib/modules/registry";
import { modelRead } from "@/lib/modules/actions";
import { getCurrentAccessUser } from "@/lib/access/current";

type Props = { params: Promise<{ module: string; path?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Shared route validation for the page and its metadata. */
async function resolveRoute(params: Props["params"]) {
  const { module: moduleId, path = [] } = await params;
  const definition = getModule(moduleId);
  if (!definition || !definition.models.length) notFound();
  if (!path.length) {
    const actor = await getCurrentAccessUser();
    if (!actor) redirect("/auth");
    const first = definition.models.find(model => actor.modelAccess[model.id]?.read);
    if (!first) redirect("/erp");
    redirect(first.route);
  }
  const found = getModuleModel(`${moduleId}.${path[0]}`);
  if (!found || path.length > 2) notFound();
  const id = path.length === 1 || path[1] === "nuevo" ? undefined : decodeURIComponent(path[1]);
  if (id !== undefined && (!id.trim() || id.length > 100)) notFound();
  return { entry: found.entry, collection: path.length === 1, id };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entry, collection, id } = await resolveRoute(params);
  if (collection) return { title: entry.label };
  if (!id) return { title: "Nuevo registro" };
  // Reuse the authorized read: metadata must respect the same session and record rules.
  // Failures reveal neither the record's name nor the server's error message.
  const record = await modelRead(entry.id, id);
  return { title: record.ok && record.displayName ? record.displayName : "Registro" };
}

/** Convention: /erp/<module>/<model>, /nuevo and /<id>. Only registered models resolve. */
async function Resolve({ params, searchParams }: Props) {
  const { entry, collection, id } = await resolveRoute(params);
  const actor = await getCurrentAccessUser();
  if (!actor) redirect("/auth");
  const permissions = actor.modelAccess[entry.id];
  if (!permissions?.read || (!collection && !id && !permissions.create)) return <p role="alert" className="p-6">No tienes permiso para abrir esta vista.</p>;
  const config = modelClientConfig(entry.id, actor);
  const { views } = entry;
  if (collection) {
    const query = await searchParams;
    const selected = selectedCollectionView(query.view, entry.collectionViews, entry.view);
    const loader = views[selected];
    const Presentation = typeof loader === "function" ? (await loader()).default : ModelCollection;
    return <CollectionViews views={entry.collectionViews} selected={selected}><Presentation config={{ ...config, view: selected }} /></CollectionViews>;
  }
  const Form = views.form ? (await views.form()).default : ModelForm;
  return <Form key={id ?? "nuevo"} config={config} id={id} />;
}

export default function Page(props: Props) {
  return <Suspense fallback={<p role="status" className="p-6">Cargando…</p>}><Resolve {...props} /></Suspense>;
}
