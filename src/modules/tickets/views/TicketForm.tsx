"use client";

import ModelForm, { ModelExtensions } from "@/components/modules/ModelForm";
import FormGroup from "@/components/ui/form/FormGroup";
import FieldBoolean from "@/components/ui/form/FieldBoolean";
import FieldNumber from "@/components/ui/form/FieldNumber";
import FieldSelect from "@/components/ui/form/FieldSelect";
import FieldText from "@/components/ui/form/FieldText";
import type { ModelClientConfig } from "@/lib/modules/config";
import type { FormValues } from "@/lib/orm/model";
import type { Ticket } from "../models/ticket";
import FieldDate from "@/components/ui/form/FieldDate";
import FormHeader from "@/components/ui/form/FormHeader";
import Stack from "@/components/ui/form/Stack";
import FieldMany2One from "@/components/ui/form/FieldMany2One";

type Values = FormValues<typeof Ticket>;

/**
 * Vista expulsada con eject:view: edita libremente la maquetación.
 * ModelForm aporta carga, guardado, recarga, breadcrumbs, historial y eliminación.
 */
export default function TicketForm({
  config,
  id,
}: {
  config: ModelClientConfig;
  id?: string;
}) {
  return (
    <ModelForm config={config} id={id}>
      <FormHeader>
        <FieldSelect<Values>
          name="estado"
          direction="inline"
          widget="statebar"
          label=""
        />
      </FormHeader>
      <div className="col-span-full flex">
        <FieldText<Values> name="name" widget="header" direction="inline" />
      </div>
      <FormGroup>
        <FieldText<Values> name="asunto" direction="inline" />
        <FieldMany2One<Values> name="categoriaId" direction="inline" />
        <FieldText<Values> name="descripcion" widget="long" />
      </FormGroup>
      <FormGroup>
        <Stack>
          <FieldSelect<Values> name="prioridad" direction="inline" />
          <FieldNumber<Values>
            name="estimacionMinutos"
            type="integer"
            direction="inline"
          />
          <FieldNumber<Values>
            name="presupuestoMinutos"
            type="integer"
            direction="inline"
          />
          <FieldNumber<Values>
            name="estimacionMinutos"
            type="integer"
            direction="inline"
          />
          <FieldNumber<Values>
            name="presupuestoMinutos"
            type="integer"
            direction="inline"
          />
          <FieldDate<Values>
            name="compromisoAt"
            type="datetime"
            direction="inline"
          />
          <FieldBoolean<Values> name="requiereVisita" direction="inline" />
          <FieldBoolean<Values> name="active" direction="inline" />
        </Stack>
      </FormGroup>
      {/* Campos que otros módulos añaden a este modelo (extensiones). */}
      <ModelExtensions />
    </ModelForm>
  );
}
