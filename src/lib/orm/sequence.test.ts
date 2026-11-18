import assert from "node:assert/strict";
import { test } from "node:test";
import { Fields, Model, defineModel, onchange } from "./index";
import { fieldInputSchema, formatSequence, sequenceConfig, sequencePeriod } from "./sequence";
import { assignSequences, assertSequences } from "./sequence.server";
import { fieldFromMetadata } from "../modules/fields";
import { fieldExpression, generateModule } from "./generator/generate";

const sequence = sequenceConfig({ prefix: "TCK-{year}-", padding: 6, reset: "year" });
class Ticket extends Model { name = Fields.Text({ label: "Folio", sequence }); description = Fields.Text({ required: true }); }
const contract = defineModel(Ticket, { name: "SupportTicket", table: "support_ticket" });

test("sequence is required/unique in storage, readonly in metadata and empty only in drafts", () => {
  const field = contract.fields.name;
  assert.equal(field.metadata.required, true); assert.equal(field.metadata.unique, true); assert.equal(field.metadata.readOnly, true);
  assert.equal(field.schema.safeParse("").success, false);
  assert.equal(fieldInputSchema(field).safeParse("").success, true);
  assert.equal(contract.formSchema.safeParse({ name: "", description: "Repair" }).success, true);
  assert.equal(contract.schema.safeParse({ name: "", description: "Repair" }).success, false);
  assert.equal(field.createDefault(), "");
  assert.deepEqual(fieldFromMetadata(field.metadata).metadata.sequence, sequence);
  assert.match(fieldExpression(field.metadata), /sequence/);
});

test("sequence formats use UTC periods, minimum padding and explicitly bounded options", () => {
  assert.equal(formatSequence(sequence, 1n, new Date("2026-12-31T23:59:59Z")), "TCK-2026-000001");
  assert.equal(sequencePeriod(sequence, new Date("2027-01-01T00:00:00Z")), "2027");
  assert.equal(formatSequence(sequence, 1000000n, new Date("2026-01-01Z")), "TCK-2026-1000000");
  assert.equal(sequencePeriod(sequenceConfig({ prefix: "TCK-" }), new Date()), "all");
  for (const options of [{ reset: "year" }, { padding: 0 }, { padding: 13 }, { prefix: "{month}" }, { prefix: "T\n" }, { reset: "month" }, { start: 100 }]) assert.throws(() => sequenceConfig(options as never));
  for (const options of [{ required: false }, { unique: false }, { default: "X" }, { compute: "a" }, { related: "x.name" }, { sensitive: true }, { trim: false }, { minLength: 2 }, { maxLength: 3 }]) assert.throws(() => Fields.Text({ ...options, sequence } as never));
});

test("sequence assignment rejects forged input before allocation and protects edits and hooks", async () => {
  let allocations = 0;
  const tx = { modelSequence: { upsert: async (args: { create: { configuration: string } }) => ({ configuration: args.create.configuration, value: BigInt(++allocations) }) } } as never;
  await assert.rejects(assignSequences(tx, contract.name, contract.metadata, { name: "FORGED" }, null)); assert.equal(allocations, 0);
  const created = await assignSequences(tx, contract.name, contract.metadata, { name: "", description: "A" }, null, new Date("2026-01-01Z"));
  assert.equal(created.values.name, "TCK-2026-000001"); assert.ok(Object.isFrozen(created.locked));
  const edited = await assignSequences(tx, contract.name, contract.metadata, { description: "B" }, created.values);
  assert.equal(edited.values.name, created.values.name); assert.equal(allocations, 1);
  await assert.rejects(assignSequences(tx, contract.name, contract.metadata, { name: "OTHER" }, created.values));
  assert.throws(() => assertSequences({ name: null }, created.locked));
  assertSequences(created.values, created.locked);
});

test("sequence detects series configuration changes and generates a unique non-null column", async () => {
  const tx = { modelSequence: { upsert: async () => ({ configuration: "changed", value: 1n }) } } as never;
  await assert.rejects(assignSequences(tx, contract.name, contract.metadata, { name: "" }, null), /formato/);
  const result = generateModule({ id: "support", depends: [], models: [{ model: contract, clientFields: ["name", "description"] }] }, { schema: 'datasource db {\n provider = "postgresql"\n}\nmodel User {\n id String @id\n}\n', owners: {} });
  assert.match(result["models.prisma"], /name String @unique/);
  assert.doesNotMatch(result["models.prisma"], /name String\?/);
  class Bad extends Model {
    name = Fields.Text({ sequence });
    @onchange({ fields: ["name"], writes: ["name"] }) change() { return { name: "X" }; }
  }
  assert.throws(() => defineModel(Bad, { name: "Bad", table: "bad" }), /sequence/);
});
