import assert from "node:assert/strict";
import test from "node:test";
import { Fields, isField, isOne2many } from "./fields";
import { Model, defineModel } from "./model";
import { defineModule } from "../modules/define";
import { createModelService } from "./service";
import { unboundRepository } from "./repository";
import { modelSnapshot } from "./snapshot";

class Parent extends Model {
  name=Fields.Text({required:true});
  lines=Fields.One2many("LinesChild",{inverse:"parentId",maxRows:3});
}
class Child extends Model {
  name=Fields.Text({required:true});
  parentId=Fields.Many2one("LinesParent",{required:true,onDelete:"Restrict"});
}
const moduleSpec={id:"lines",name:"Lines",icon:"list",models:{parent:Parent,child:Child}};

test("One2many uses a form-only descriptor, fresh arrays and no Prisma scalar columns",()=>{
  const model=defineModel(Parent,{name:"LinesParent",table:"lines_parent"});
  assert.ok(isOne2many(model.one2manyFields.lines));assert.equal(isField(model.one2manyFields.lines),false);
  assert.deepEqual(Object.keys(model.metadata),["name"]);assert.deepEqual(Object.keys(model.fields),["name"]);
  const defaults=model.createDefaults();defaults.lines.push({name:"first"});assert.deepEqual(model.createDefaults().lines,[]);
  assert.equal(model.schema.safeParse({name:"Parent",lines:[]}).success,false);
  assert.equal(model.formSchema.safeParse({name:"Parent",lines:[]}).success,true);
  assert.equal(model.formSchema.safeParse({name:"Parent"}).success,false);
  assert.equal(model.formSchema.safeParse({name:"Parent",lines:Array(4).fill({name:"x"})}).success,false);
  assert.throws(()=>createModelService(model,unboundRepository(),{columns:[{field:"name",label:"Nombre"}],searchFields:[]}),/One2many/);
});

test("One2many declarations fail early for unsupported ownership and unsafe options",()=>{
  assert.doesNotThrow(()=>defineModule(moduleSpec));
  for(const options of [{inverse:"id"},{inverse:"parentId",maxRows:101},{inverse:"parentId",minRows:4,maxRows:3},{inverse:"parentId",maxRows:0},{inverse:"parentId",minRows:0.5},{inverse:"parentId",label:""},{inverse:"parentId",extra:true}]) assert.throws(()=>Fields.One2many("LinesChild",options));
  assert.throws(()=>Fields.One2many("../Child",{inverse:"parentId"}));
  assert.throws(()=>Fields.One2many("LinesChild",{} as never));
  for(const Foreign of [
    class extends Model {name=Fields.Text();parentId=Fields.Many2one("LinesParent");},
    class extends Model {name=Fields.Text();parentId=Fields.Many2one("LinesParent",{required:true,unique:true});},
    class extends Model {name=Fields.Text({sensitive:true});parentId=Fields.Many2one("LinesParent",{required:true});},
    class extends Model {name=Fields.Text();parentId=Fields.Many2one("Other",{required:true});},
    class extends Child {lines=Fields.One2many("LinesParent",{inverse:"parentId"});},
  ]) assert.throws(()=>defineModule({...moduleSpec,models:{parent:Parent,child:Foreign}}),/One2many/);
  class Duplicate extends Parent {other=Fields.One2many("LinesChild",{inverse:"parentId"});}
  assert.throws(()=>defineModule({...moduleSpec,models:{parent:Duplicate,child:Child}}),/inversa/);
  assert.throws(()=>defineModule({...moduleSpec,models:{parent:Parent}}),/One2many/);
});

test("readonly model snapshots isolate and freeze nested lines used by previous/actions/constraints",()=>{
  const original={lines:[{name:"Original"}]};const previous=modelSnapshot(original);
  assert.throws(()=>previous.lines.push({name:"Injected"}),TypeError);
  assert.throws(()=>{previous.lines[0].name="Changed";},TypeError);
  assert.equal(original.lines[0].name,"Original");assert.notEqual(original.lines,previous.lines);
});
