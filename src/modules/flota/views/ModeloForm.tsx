"use client";

import ModelForm from "@/components/modules/ModelForm";
import FormGroup from "@/components/ui/form/FormGroup";
import FieldBoolean from "@/components/ui/form/FieldBoolean";
import FieldMany2One from "@/components/ui/form/FieldMany2One";
import FieldText from "@/components/ui/form/FieldText";
import type { ModelClientConfig } from "@/lib/modules/config";
import type { FormValues } from "@/lib/orm/model";
import type { Modelo } from "../models/modelo";
import FieldNumber from "@/components/ui/form/FieldNumber";

type Values = FormValues<typeof Modelo>;

/**
 * Vista expulsada con eject:view: edita libremente la maquetación.
 * ModelForm aporta carga, guardado, recarga, breadcrumbs, historial y eliminación.
 */
export default function ModeloForm({
  config,
  id,
}: {
  config: ModelClientConfig;
  id?: string;
}) {
  return (
    <ModelForm config={config} id={id}>
      <div className="col-span-full">
        <FieldText<Values> name="name" widget="header" />
      </div>
      <FormGroup legend="Datos generales">
        <FieldText<Values> name="name" direction="inline" />
        <FieldMany2One<Values> name="fabricanteId" direction="inline" />
        <FieldNumber<Values>
          name="intervaloServicioKm"
          type="integer"
          direction="inline"
        />
        <FieldBoolean<Values> name="active" direction="inline" />
      </FormGroup>
    </ModelForm>
  );
}
