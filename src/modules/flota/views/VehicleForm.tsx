"use client";

import ModelForm from "@/components/modules/ModelForm";
import FormGroup from "@/components/ui/form/FormGroup";
import FieldBoolean from "@/components/ui/form/FieldBoolean";
import FieldImage from "@/components/ui/form/FieldImage";
import FieldMany2One from "@/components/ui/form/FieldMany2One";
import FieldText from "@/components/ui/form/FieldText";
import type { ModelClientConfig } from "@/lib/modules/config";
import type { FormValues } from "@/lib/orm/model";
import type { Vehicle } from "../models/vehicle";
import Stack from "@/components/ui/form/Stack";
import FormHeader from "@/components/ui/form/FormHeader";
import FormButton from "@/components/ui/form/FormButton";
import { useWatch } from "react-hook-form";
import FieldSelect from "@/components/ui/form/FieldSelect";
import FieldNumber from "@/components/ui/form/FieldNumber";

type Values = FormValues<typeof Vehicle>;

/**
 * Vista expulsada con eject:view: edita libremente la maquetación.
 * ModelForm aporta carga, guardado, recarga, breadcrumbs, historial y eliminación.
 */
export default function VehicleForm({ config, id }: { config: ModelClientConfig; id?: string }) {
  return (
    <ModelForm config={config} id={id}>
      <FormContent />
    </ModelForm>
  );
}

function FormContent() {
  const [estado] = useWatch<Values>({ name: ["estado"] });
  return (
    <>
      <FormHeader>
        <div className="flex flex-wrap gap-2">
          <FormButton action="enviarMantenimiento" invisible={estado !== "disponible"} />
          <FormButton action="finalizarMantenimiento" invisible={estado !== "mantenimiento"} />
        </div>
        <FieldSelect name="estado" widget="statebar" label="" />
      </FormHeader>

      <div className="col-span-full flex flex-wrap items-center gap-4">
        <FieldImage mode="display" name="fabricanteLogo" widget="avatar" shape="squared" label="" />
        <div className="min-w-0 flex-1">
          <FieldText<Values> name="name" widget="header" />
        </div>
      </div>
      <FormGroup legend="Datos generales">
        <Stack>
          <FieldText<Values> name="plate" />
          <FieldMany2One<Values> name="modeloId" />
          <FieldNumber<Values> name="kilometraje" type="integer" />
          <FieldNumber<Values> name="proximoServicioKm" type="integer" />
          <FieldNumber name="kilometrosRestantes" type="integer" mode="display" />
        </Stack>
        <FieldBoolean<Values> name="active" />
      </FormGroup>
    </>
  );
}
