import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { Fields, Model, depends } from "../orm";
import { defineModule } from "../modules/define";
import { accessFieldsList, accessModelsList } from "./model-catalogue.config";
import { accessCataloguePage, describeAccessModels, listAccessModels, readAccessModel, listAccessFields } from "./model-catalogue";

let defaultsCalled = 0;
class Marca extends Model { name=Fields.Text(); logo=Fields.Image({folder:"catalogue/brand"}); }
class Documento extends Model {
  name=Fields.Text({label:"Nombre",default:()=>{defaultsCalled++;return "FACTORY_SECRET";}});
  secret=Fields.Text({sensitive:true,default:"LITERAL_SECRET"});
  amount=Fields.Integer({default:1});
  marcaId=Fields.Many2one("CatalogoMarca");
  logo=Fields.Image({label:"Logo",related:"marcaId.logo"});
  total=Fields.Integer({label:"Total",compute:"calculate"});
  lines=Fields.One2many("CatalogoDetalle",{inverse:"documentoId",label:"Detalles"});
  @depends("amount") calculate(values:Readonly<Record<string,unknown>>) {return values.amount;}
}
class Detalle extends Model {name=Fields.Text({required:true});documentoId=Fields.Many2one("CatalogoDocumento",{required:true});}
const definition=defineModule({id:"catalogo",name:"Catálogo de prueba",icon:"list",models:{documento:Documento,marca:Marca,detalle:Detalle}});
const state={query:"",sort:"label",direction:"asc",page:1,pageSize:25,filters:[]};

test("catalogue projects declared stored/related/computed/One2many Fields without secrets or executable metadata",()=>{
  const entries=describeAccessModels([definition]);
  const entry=entries.find(entry=>entry.model.id==="catalogo.documento")!;
  assert.equal(entry.model.fieldCount,7);assert.equal(entry.model.name,"CatalogoDocumento");
  const byName=Object.fromEntries(entry.fields.map(field=>[field.name,field]));
  assert.equal(byName.secret.sensitive,true);assert.equal(byName.marcaId.target,"CatalogoMarca");
  assert.equal(byName.logo.origin,"Relacionado");assert.equal(byName.logo.source,"marcaId.logo");assert.equal(byName.logo.readOnly,true);
  assert.equal(byName.total.origin,"Calculado");assert.equal(byName.total.readOnly,true);
  assert.equal(byName.lines.type,"One2many");assert.equal(byName.lines.target,"CatalogoDetalle");assert.equal(byName.lines.source,"documentoId");
  assert.equal(Object.hasOwn(byName,"id"),false);assert.equal(Object.hasOwn(byName,"createBy"),false);
  assert.equal(defaultsCalled,0);
  const serialized=JSON.stringify(entries);
  for(const hidden of ["FACTORY_SECRET","LITERAL_SECRET","createDefault","schema","calculate","catalogue/brand"]) assert.equal(serialized.includes(hidden),false,hidden);
  assert.deepEqual(JSON.parse(serialized),entries);
});

test("catalogue search/filter/sort/pagination are bounded and cannot request hidden fields or arbitrary queries",()=>{
  const catalogue=describeAccessModels([definition]),records=catalogue.map(entry=>entry.model);
  const found=accessCataloguePage(records,{...state,query:"CATALOGO",page:999,pageSize:1},accessModelsList);
  assert.equal(found.total,3);assert.equal(found.page,3);assert.equal(found.rows.length,1);
  const numeric=accessCataloguePage(records,{...state,sort:"fieldCount",direction:"desc"},accessModelsList);
  assert.equal(numeric.rows[0].id,"catalogo.documento");
  const fields=catalogue[0].fields;
  const derived=accessCataloguePage(fields,{...state,sort:"name",filters:[{field:"origin",operator:"eq",value:"calculado"}]},accessFieldsList);
  assert.deepEqual(derived.rows.map(row=>row.name),["total"]);
  assert.equal(accessCataloguePage(fields,{...state,sort:"name",query:"many2one"},accessFieldsList).total,1);
  for(const patch of [{sort:"schema"},{filters:[{field:"defaults",operator:"empty"}]},{filters:[{field:"sensitive",operator:"eq",value:"true"}]},{filters:[{field:"label",operator:"gt",value:"a"}]},{groupBy:["label"]},{groupPath:["a"]},{pageSize:100},{domain:[]},{actor:{id:"root"}},{invalidFilters:true}]) assert.throws(()=>accessCataloguePage(records,{...state,...patch},accessModelsList));
});

function fixture(account={active:true,isAdmin:true,sessionVersion:1}) {
  let checks=0;
  const tx={user:{findUnique:async()=>{checks++;return account;}}} as unknown as Prisma.TransactionClient;
  const prisma={$transaction:async(run:(tx:Prisma.TransactionClient)=>unknown)=>run(tx)} as unknown as PrismaClient;
  return {prisma,checks:()=>checks};
}
test("metadata services revalidate active admin/session transactionally, including unknown IDs and each page",async()=>{
  const actor={id:"admin",sessionVersion:1};
  for(const account of [{active:true,isAdmin:false,sessionVersion:1},{active:false,isAdmin:true,sessionVersion:1},{active:true,isAdmin:true,sessionVersion:2}]) {
    const {prisma,checks}=fixture(account);
    await assert.rejects(listAccessModels(prisma,actor,state));
    await assert.rejects(readAccessModel(prisma,actor,"missing.model"));
    await assert.rejects(listAccessFields(prisma,actor,{id:"missing.model",state}));
    assert.equal(checks(),3);
  }
  const {prisma,checks}=fixture();
  const models=await listAccessModels(prisma,actor,state);assert.ok(models.ok);
  assert.equal((await readAccessModel(prisma,actor,"../users")).ok,false);
  assert.equal((await readAccessModel(prisma,actor,{id:"flota.vehicle"})).ok,false);
  await assert.rejects(listAccessFields(prisma,actor,{id:"missing.model",state}));
  assert.equal(checks(),4);
});
