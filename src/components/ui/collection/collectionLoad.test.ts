import { test } from "node:test";
import assert from "node:assert/strict";
import { collectionConnectionError, collectionResponse, startCollectionLoad, type CollectionLoader, type CollectionResponse } from "./collectionLoad";
import { mergeKanbanRows } from "@/lib/kanban/types";
import type { ListPage, ListResult } from "@/lib/list/types";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const page = (id: string, number = 1): ListPage => ({ rows: [{ id }], total: 3, page: number, pageSize: 1 });
const ok = (id: string): ListResult => ({ ok: true, data: page(id) });
const flush = () => new Promise(resolve => setImmediate(resolve));

test("a late success or error cannot replace the newer query; cancellation before start skips loading", async () => {
  const old = deferred<ListResult>(), latest = deferred<ListResult>();
  const published: ListResult[] = [];
  const cancel = startCollectionLoad(() => old.promise, value => published.push(value));
  await flush();
  cancel();
  startCollectionLoad(() => latest.promise, value => published.push(value));
  latest.resolve(ok("new")); await flush();
  old.resolve(ok("old")); await flush();
  assert.deepEqual(published, [ok("new")]);
  const rejected = deferred<ListResult>();
  const stop = startCollectionLoad(() => rejected.promise, value => published.push(value));
  await flush(); stop(); rejected.reject(new Error("late failure")); await flush();
  let called = false;
  startCollectionLoad(async () => { called = true; return ok("unused"); }, value => published.push(value))();
  await flush();
  assert.equal(called, false); assert.equal(published.length, 1);
});

test("connection exceptions and synchronous throws become recoverable results; server messages survive", async () => {
  const results: ListResult[] = [];
  startCollectionLoad(() => { throw new Error("private detail"); }, value => results.push(value));
  await flush();
  startCollectionLoad(async () => ({ ok: false, error: "Lectura denegada" }), value => results.push(value));
  await flush();
  startCollectionLoad(async () => ok("retry"), value => results.push(value)); await flush();
  startCollectionLoad(async () => { throw new Error("private network detail"); }, value => results.push(value)); await flush();
  assert.deepEqual(results, [{ ok: false, error: collectionConnectionError }, { ok: false, error: "Lectura denegada" }, ok("retry"), { ok: false, error: collectionConnectionError }]);
});

test("columns have independent cancellation and retry lifecycles", async () => {
  const first = deferred<ListResult>(), second = deferred<ListResult>();
  const left: ListResult[] = [], right: ListResult[] = [];
  const stop = startCollectionLoad(() => first.promise, value => left.push(value));
  startCollectionLoad(() => second.promise, value => right.push(value));
  await flush(); stop(); first.resolve(ok("obsolete")); second.resolve(ok("right")); await flush();
  startCollectionLoad(async () => ok("left-retry"), value => left.push(value)); await flush();
  assert.deepEqual(left, [ok("left-retry")]); assert.deepEqual(right, [ok("right")]);
});

test("incremental retry retains pages, deduplicates identities, and never merges other filters/providers", () => {
  const load: CollectionLoader = async () => ok("unused");
  const merge = (previous: ListPage | null, incoming: ListPage): ListPage => ({ ...incoming, rows: incoming.page === 1 ? incoming.rows : mergeKanbanRows(previous?.rows ?? [], incoming.rows) });
  let state: CollectionResponse = collectionResponse(null, "p1", "todo", load, ok("one"), merge);
  state = collectionResponse(state, "p2", "todo", load, { ok: false, error: "Connection" }, merge);
  assert.deepEqual(state.data?.rows, [{ id: "one" }]);
  state = collectionResponse(state, "p2-retry", "todo", load, { ok: true, data: page("two", 2) }, merge);
  state = collectionResponse(state, "p2-again", "todo", load, { ok: true, data: page("two", 2) }, merge);
  assert.deepEqual(state.data?.rows, [{ id: "one" }, { id: "two" }]);
  assert.equal(collectionResponse(state, "x", "other-filter", load, { ok: false, error: "Error" }, merge).data, null);
  assert.equal(collectionResponse(state, "x", "todo", async () => ok("other"), { ok: false, error: "Error" }, merge).data, null);
  assert.deepEqual(collectionResponse(state, "refresh", "todo", load, ok("fresh"), merge).data?.rows, [{ id: "fresh" }]);
});
