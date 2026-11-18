"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormLayout from "@/components/ui/form/FormLayout";
import FormGroup from "@/components/ui/form/FormGroup";
import FieldText from "@/components/ui/form/FieldText";
import { simulateSequence } from "./sequence.actions";
import { sequenceSampleFields, sequenceSampleSchema, type SequenceSampleValues, type SequenceSampleOutput } from "./sequence.schema";

const defaults = { name: "", descripcion: "Revisar equipo" };
const model = { fields: sequenceSampleFields };
export default function SequenceSample() {
  const methods = useForm<SequenceSampleValues, unknown, SequenceSampleOutput>({ resolver: zodResolver(sequenceSampleSchema), defaultValues: defaults });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <section id="model-sequences" className="card min-w-0 scroll-mt-6 border border-base-300 bg-base-100 p-4 sm:p-6">
    <h2 className="text-xl font-semibold">Folio definido en el modelo</h2>
    <p className="my-3 text-sm">Simula el primer folio de un ticket. El servidor devuelve un ejemplo con el año UTC actual; no guarda registros, no incrementa contadores ni emite folios reales.</p>
    <FormLayout methods={methods} model={model} onSubmit={async values => {
      setError(null);
      const result = await simulateSequence(values);
      if (!result.ok) { setError(result.error); return; }
      methods.reset(result.values); setSaved(true);
    }}>
      <FormGroup><FieldText<SequenceSampleValues> name="name" direction="inline" /><FieldText<SequenceSampleValues> name="descripcion" direction="inline" /></FormGroup>
      <div className="col-span-full flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saved || methods.formState.isSubmitting}>Simular creación</button>
        <button type="button" className="btn btn-ghost" onClick={() => { methods.reset(defaults); setSaved(false); setError(null); }}>Nuevo ejemplo</button>
      </div>
    </FormLayout>
    {saved && <p role="status" className="mt-3 text-sm">Folio de demostración asignado. Nuevo ejemplo vuelve al borrador «Nuevo».</p>}
    {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
  </section>;
}
