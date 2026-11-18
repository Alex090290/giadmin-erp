"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormLayout from "@/components/ui/form/FormLayout";
import FormGroup from "@/components/ui/form/FormGroup";
import FieldRelationTag from "@/components/ui/form/FieldRelationTag";
import type { Many2OneLoader } from "@/lib/many2one/model-lookup";
import { tags, many2manySampleSchema, type Many2manySampleValues } from "./many2many.schema";

const options = ["Urgente", "Instalación", "Revisión", "Soporte", "Garantía"].map((label, index) => ({ value: `tag-${index}`, label, record: { id: `tag-${index}` } }));
const load: Many2OneLoader = async request => {
  const matches = options.filter(option => request.ids ? request.ids.includes(option.value) : option.label.toLocaleLowerCase().includes((request.query ?? "").toLocaleLowerCase()));
  const page = request.page ?? 1, pageSize = request.ids?.length ?? request.pageSize ?? 5;
  return { ok: true, items: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageSize };
};
const model = { fields: {}, many2many: { etiquetas: tags }, lookups: { etiquetas: load } };

export default function Many2manySample() {
  const methods = useForm<Many2manySampleValues>({ resolver: zodResolver(many2manySampleSchema), defaultValues: { etiquetas: [] } });
  const [result, setResult] = useState<Many2manySampleValues | null>(null);
  return <section id="many2many-model" className="card min-w-0 scroll-mt-6 border border-base-300 bg-base-100 p-4 sm:p-6">
    <h2 className="text-xl font-semibold">Many2many declarativo</h2>
    <p className="my-3 text-sm">Selecciona entre una y tres etiquetas. Datos ficticios en memoria: esta demo valida IDs y no persiste registros ni vínculos.</p>
    <FormLayout methods={methods} model={model} onSubmit={setResult}>
      <FormGroup><FieldRelationTag<Many2manySampleValues> name="etiquetas" direction="inline" /></FormGroup>
      <div className="col-span-full flex gap-2">
        <button type="submit" className="btn btn-primary">Validar selección</button>
        <button type="button" className="btn btn-soft" onClick={() => { methods.reset({ etiquetas: ["tag-0", "tag-1"] }); setResult(null); }}>Cargar ejemplo</button>
        <button type="button" className="btn btn-ghost" onClick={() => { methods.reset({ etiquetas: [] }); setResult(null); }}>Restablecer</button>
      </div>
    </FormLayout>
    {result && <pre role="status" className="mt-3 overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>}
  </section>;
}
