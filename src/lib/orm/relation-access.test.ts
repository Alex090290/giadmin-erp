import assert from "node:assert/strict";
import { test } from "node:test";
import { cachedRelationAccess, maskRelations, relationTargets, withRelationIds, type RelationAccess } from "./relation-access";

const displayPolicy = {
  id: [],
  name: [{ model: "Vehicle", field: "name" }],
  "modelo.name": [{ model: "Vehicle", field: "modeloId", target: "Modelo" }, { model: "Modelo", field: "name" }],
  "modelo.fabricante.name": [
    { model: "Vehicle", field: "modeloId", target: "Modelo" },
    { model: "Modelo", field: "fabricanteId", target: "Fabricante" },
    { model: "Fabricante", field: "name" },
  ],
};

test("relation prefixes map to their target models; related groups skip their root guard", () => {
  assert.deepEqual([...relationTargets(displayPolicy)], [["modelo", "Modelo"], ["modelo.fabricante", "Fabricante"]]);
  const related = { "fabricante.logo": [{ model: "Vehicle", field: "modeloId", target: "Modelo" }, { model: "Modelo", field: "fabricanteId", target: "Fabricante" }, { model: "Fabricante", field: "logo" }] };
  assert.deepEqual([...relationTargets(related, 1)], [["fabricante", "Fabricante"]]);
  assert.throws(() => relationTargets({ "modelo.name": [{ model: "Vehicle", field: "modeloId" }] }), /destino/);
});

test("nested selects also load the related ID", () => {
  assert.deepEqual(withRelationIds({ id: true, modelo: { select: { name: true, fabricante: { select: { name: true } } } } }),
    { id: true, modelo: { select: { name: true, fabricante: { select: { name: true, id: true } }, id: true } } });
});

test("unreadable related records are masked as null, with everything below them", async () => {
  const rows = [
    { id: "v1", modelo: { id: "m1", name: "Golf", fabricante: { id: "f1", name: "VW" } } },
    { id: "v2", modelo: { id: "m2", name: "Secreto", fabricante: { id: "f2", name: "Oculto" } } },
    { id: "v3", modelo: { id: "m1", name: "Golf", fabricante: { id: "f1", name: "VW" } } },
    { id: "v4", modelo: { id: "m3", name: "Polo", fabricante: { id: "f3", name: "Restringido" } } },
    { id: "v5", modelo: null },
  ];
  const calls: [string, string[]][] = [];
  const access: RelationAccess = async (target, ids) => {
    calls.push([target, [...ids]]);
    return new Set(ids.filter(id => (target === "Modelo" ? ["m1", "m3"] : ["f1"]).includes(id)));
  };
  await maskRelations(rows, relationTargets(displayPolicy), access);
  assert.deepEqual(rows.map(row => row.modelo), [
    { id: "m1", name: "Golf", fabricante: { id: "f1", name: "VW" } },
    null,
    { id: "m1", name: "Golf", fabricante: { id: "f1", name: "VW" } },
    { id: "m3", name: "Polo", fabricante: null },
    null,
  ]);
  // One batch per relation level with unique IDs; masked parents are not queried below.
  assert.deepEqual(calls, [["Modelo", ["m1", "m2", "m3"]], ["Fabricante", ["f1", "f3"]]]);
});

test("without access the projection is untouched; cached access asks once per target and ID", async () => {
  const rows = [{ id: "v1", modelo: { id: "m1", name: "Golf" } }];
  await maskRelations(rows, relationTargets(displayPolicy));
  assert.equal(rows[0].modelo?.name, "Golf");
  let asked = 0;
  const access = cachedRelationAccess(async (_target, ids) => { asked += ids.length; return new Set(ids.filter(id => id !== "x")); });
  assert.deepEqual([...await access("Modelo", ["a", "x"])], ["a"]);
  assert.deepEqual([...await access("Modelo", ["a", "x", "b"])], ["a", "b"]);
  assert.equal(asked, 3);
  await assert.rejects(maskRelations([{ id: "v", modelo: { name: "sin id" } }], relationTargets(displayPolicy), access), /ID/);
});
