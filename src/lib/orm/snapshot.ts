/** Isolate readonly model inputs, including nested draft lines, from hook mutations. */
export function modelSnapshot<T>(value: T): T {
  const copy = structuredClone(value);
  function freeze(value: unknown) {
    if (!value || typeof value !== "object") return;
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  freeze(copy);
  return copy;
}
