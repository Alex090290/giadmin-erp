import type { ListPage, ListResult } from "@/lib/list/types";

export const collectionConnectionError = "No pudimos conectar. Intenta nuevamente.";
export type CollectionLoader = (key: string) => Promise<ListResult>;
export type CollectionMerge = (previous: ListPage | null, incoming: ListPage) => ListPage;
export type CollectionResponse = {
  key: string; scope: string; load: CollectionLoader; result: ListResult; data: ListPage | null;
};

/** Logical cancellation: Server Actions already sent may finish, but never publish stale results. */
export function startCollectionLoad(load: () => Promise<ListResult>, publish: (result: ListResult) => void) {
  let current = true;
  void Promise.resolve().then(async () => {
    if (!current) return;
    let result: ListResult;
    try { result = await load(); }
    catch { result = { ok: false, error: collectionConnectionError }; }
    if (current) publish(result);
  });
  return () => { current = false; };
}

/** Retained pages belong to the same query AND provider, never to another filter/source. */
export function collectionResponse(previous: CollectionResponse | null, key: string, scope: string, load: CollectionLoader, result: ListResult, merge?: CollectionMerge): CollectionResponse {
  const data = previous?.scope === scope && previous.load === load ? previous.data : null;
  return { key, scope, load, result, data: result.ok ? (merge ? merge(data, result.data) : result.data) : data };
}
