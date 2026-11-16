import { z } from "zod";
import { Fields } from "@/lib/orm/fields";
import { recordIdentityShape, validateRecordIdentity } from "@/lib/orm/record";

// Browser-safe metadata. Real modules receive it from modelClientConfig/buildModelUI.
export const documentFields = { name: Fields.Text({label:"Referencia",required:true,maxLength:60}) };
export const detailFields = {
  name: Fields.Text({label:"Trabajo realizado",required:true,maxLength:100}),
  fecha: Fields.DateTime({label:"Fecha",required:true}),
  kilometraje: Fields.Integer({label:"Kilometraje",required:true,min:0,default:0}),
};
export const detailSchema = z.strictObject({name:detailFields.name.schema,fecha:detailFields.fecha.schema,kilometraje:detailFields.kilometraje.schema}).extend(recordIdentityShape).superRefine(validateRecordIdentity);
export const declarativeLinesSchema = z.strictObject({name:documentFields.name.schema,lineas:z.array(detailSchema).max(5)});
export type DeclarativeLinesInput = z.input<typeof declarativeLinesSchema>;
export function createDetail() { return {name:"",fecha:null,kilometraje:0}; }
export const declarativeLinesModel = {
  fields:documentFields,
  lines:{lineas:{label:"Mantenimientos de demostración",fields:detailFields,minRows:0,maxRows:5,createRow:createDetail,capabilities:{read:true,create:true,write:true,unlink:true}}},
};
