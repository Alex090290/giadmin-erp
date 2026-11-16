"use client";

import type { ListResult } from "@/lib/list/types";
import { useEffect, useState } from "react";
import { collectionResponse, startCollectionLoad, type CollectionLoader, type CollectionMerge, type CollectionResponse } from "./collectionLoad";

/** One request lifecycle per collection, expanded branch or Kanban column. */
export function useCollectionLoad(key: string, load: CollectionLoader, options?: { scope: string; merge: CollectionMerge; onResult?: (result: ListResult) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<CollectionResponse | null>(null);
  const requestKey = JSON.stringify([key, attempt]);
  const scope = options?.scope ?? key;
  const merge = options?.merge;
  const onResult = options?.onResult;
  useEffect(() => startCollectionLoad(() => load(key), result => {
    setResponse(previous => collectionResponse(previous, requestKey, scope, load, result, merge));
    onResult?.(result);
  }), [key, requestKey, scope, load, merge, onResult]);
  const sameScope = response?.scope === scope && response.load === load;
  const current = sameScope && response.key === requestKey ? response : null;
  return {
    result: current?.result ?? null,
    data: options ? (sameScope ? response.data : null) : current?.result.ok ? current.result.data : null,
    error: current && !current.result.ok ? current.result.error : null,
    loading: !current,
    refresh: () => setAttempt(value => value + 1),
  };
}
