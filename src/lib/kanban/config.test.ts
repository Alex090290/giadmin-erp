import assert from "node:assert/strict";
import test from "node:test";
import { Fields } from "../orm/fields";
import { compileKanbanConfig } from "./config";
import { canMoveKanban, type KanbanConfig } from "./types";

const metadata = {
  estado: Fields.Selection([{value:"a",label:"A"},{value:"b",label:"B"},{value:"c",label:"C"}],{required:true}).metadata,
  name: Fields.Text().metadata,
  optional: Fields.Selection([{value:"a",label:"A"}]).metadata,
  secret: Fields.Selection([{value:"a",label:"A"}],{required:true,sensitive:true}).metadata,
};
const actions = [{name:"iniciar"},{name:"terminar"}];
const compile = (input: unknown, published = ["estado"]) => compileKanbanConfig(input as KanbanConfig, metadata, actions, published);

test("Kanban accepts legacy declarations and snapshots an explicit graph without direct fallback", () => {
  assert.deepEqual(compile("estado"), {field:"estado"});
  assert.deepEqual(compile({field:"estado"}), {field:"estado"});
  const input = {field:"estado",transitions:[{from:"a",to:"b",action:"iniciar"},{from:"b",to:"c",action:"terminar"}]};
  const result = compile(input)!;
  input.transitions[0].action = "unknown";
  assert.equal(result.transitions?.[0].action,"iniciar");
  assert.ok(Object.isFrozen(result.transitions?.[0]));
  assert.equal(canMoveKanban("a","b",result.transitions),true);
  assert.equal(canMoveKanban("a","c",result.transitions),false);
  assert.equal(canMoveKanban("a","c"),true);
  assert.equal(canMoveKanban("a","a"),false);
  assert.equal(canMoveKanban("a","b",compile({field:"estado",transitions:[]})?.transitions),false);
});

test("Kanban rejects invalid fields, edges, unregistered actions and extra declaration keys", () => {
  const route={from:"a",to:"b",action:"iniciar"};
  for (const input of [null,"unknown","name","optional","secret",{field:"estado",transitions:null},
    {field:"estado",unknown:true},{field:"estado",transitions:[route,route]},
    ...[{to:"a"},{from:"unknown"},{to:"unknown"},{action:"beforeSave"},{action:"unknown"},{extra:true}].map(patch=>({field:"estado",transitions:[{...route,...patch}]}))]) {
    assert.throws(()=>compile(input),Error,JSON.stringify(input));
  }
  assert.throws(()=>compile("estado",[]),/publicada/);
});
