import { Suspense } from "react";
import { ModelCatalogueDetail } from "../ModelCatalogue";
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ModelCatalogueDetail id={id} />;
}
export default function ModelPage(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p role="status" className="p-3 text-sm text-base-content/60">Cargando modelo…</p>}><Detail {...props} /></Suspense>;
}
