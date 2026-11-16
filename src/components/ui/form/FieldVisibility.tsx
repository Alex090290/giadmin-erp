"use client";

import { createContext, useContext, type ReactNode } from "react";
import { FormModelContext } from "./modelFields";

const FieldVisibilityContext = createContext(false);
export const useFieldInvisible = () => useContext(FieldVisibilityContext);

/** Keep controls mounted: visibility must not unregister, clear or disable their values. */
export default function FieldVisibility({ name, invisible, children }: { name?: string; invisible?: boolean; children: ReactNode }) {
  const model = useContext(FormModelContext);
  const inherited = useFieldInvisible();
  const indexed = name ? /^([a-z][A-Za-z0-9]*)\.\d+\.([a-z][A-Za-z0-9]*)$/.exec(name) : null;
  const line = indexed ? model?.lines?.[indexed[1]]?.fields[indexed[2]]?.metadata : undefined;
  const metadata = name ? (model?.fields[name] ?? model?.readFields?.[name])?.metadata ?? line : undefined;
  const hidden = inherited || (invisible ?? metadata?.invisible ?? false);
  return <FieldVisibilityContext.Provider value={hidden}>
    <div hidden={hidden} className={hidden ? "hidden!" : "contents"}>{children}</div>
  </FieldVisibilityContext.Provider>;
}
