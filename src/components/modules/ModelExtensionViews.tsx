"use client";

import { createContext, useContext, type ReactNode } from "react";

const ExtensionViewsContext = createContext<Readonly<Record<string, ReactNode>>>({});

/** Server-resolved lazy views cross the boundary as React slots, never manifest loaders. */
export default function ModelExtensionViews({ views, children }: { views: Readonly<Record<string, ReactNode>>; children: ReactNode }) {
  return <ExtensionViewsContext.Provider value={views}>{children}</ExtensionViewsContext.Provider>;
}

export function useModelExtensionViews() { return useContext(ExtensionViewsContext); }
