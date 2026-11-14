# Acciones de formulario

Pendiente solicitado el 2026-11-13 y ampliado el 2026-11-14. **Implementado el
2026-11-14** (ver «Contrato implementado»); las secciones siguientes conservan el
acuerdo original y sus criterios de aceptación. Ventas y acciones en Flota siguen
sin crearse.

## Contrato implementado (2026-11-14)

Decisión del usuario: **nombre validado**. La vista escribe
`<FormButton action="confirmar">`; el navegador sólo envía ese nombre con ID y
revisión a una Server Action fija (`modelAction`), y el servidor lo compara con la
lista publicada por `@action`. No se aceptan referencias a funciones ni campos.

```ts
@action({ label: "Confirmar", groups: ["gerente"] }) // groups opcional
confirmar(record: ActionRecord<Venta>, context: ActionContext): ActionPatch<Venta> {
  if (record.estado !== "borrador") throw new ModelValidationError("Sólo borradores.");
  return { estado: "confirmada" };
}
```

- Publicación: sólo métodos con `@action` (máx. 20). Nombres reservados
  (normalize, beforeSave, afterSave, displayName, constructor) se rechazan al
  definir el modelo; label obligatorio; groups no vacío, `clave` del módulo o
  `modulo.clave`.
- Método: recibe el registro persistido congelado y `{tx, actor, action}`; puede
  leer con `context.tx`. Devuelve un patch parcial de campos declarados (o nada).
  Lanzar `ModelValidationError` expresa una transición inválida.
- Ejecución (`service.action`): transacción Serializable; permiso de escritura y
  regla de registro; grupos de la acción (el superusuario pasa); revisión vigente.
  El patch recorre el mismo `persist` del guardado (normalize, Zod, beforeSave,
  constraints, afterSave, tracking). Cualquier error revierte la acción. El
  historial registra «Acción: <label>» aunque no haya cambios rastreados. La
  respuesta es la misma que save, con el mensaje «<label>: acción completada.».
- Cliente: `FormHeader` (portal en la cabecera de FormView, dentro de RHF) y
  `FormButton` (`type="button"`, label publicado por defecto, oculto en consulta).
  FormView coordina con un bloqueo síncrono: si el registro es nuevo o tiene
  cambios, envía el formulario y espera el resultado del ciclo normal; si falla,
  se detiene. Después ejecuta `runAction(name, {id, revision})` con la revisión
  guardada. El fallo de la acción conserva lo guardado y llama `onSaved` con ello;
  un error de red no presenta éxito ni reintenta.
- ModelForm conecta `runAction` y `actions` desde `ModelClientConfig`
  automáticamente. Demo ficticia en `/sample#form-actions`.

## Problema y objetivo

FormView ya ofrece headerActions, menuActions, statebar y un ciclo de guardado.
ModelForm todavía no expone esos slots a las vistas expulsadas. Una acción como
«Confirmar» obliga hoy a repetir coordinación de RHF, validación, guardado,
identidad/revisión, bloqueo, errores y actualización del registro.

Crear FormHeader y FormButton para expresar la cabecera en JSX y compartir esa
coordinación. Conservar FormView y los contratos existentes; no reescribir sus
slots ni duplicar formularios/providers. La lógica de negocio sigue en el servidor.

## Acciones en la clase del modelo (acuerdo del 2026-11-14)

La regla de negocio de una acción como confirmar pertenece a un método de Venta,
no a un servicio separado que deba crearse por cada botón. El framework aporta
la ejecución compartida: publicación explícita de acciones, autorización y sesión
vigentes, lectura del registro, comprobación de ID/revisión, transacción, validación
y persistencia del resultado, avance de revisión, historial y respuesta canónica.
El método comprueba la transición de negocio y expresa sus cambios.

FormButton se conecta a ese método mediante una Server Action adaptadora explícita,
generada o declarada con poco código y sin duplicar reglas de negocio. Sólo se
pueden ejecutar métodos publicados como acciones; normalize, beforeSave, afterSave
y auxiliares permanecen internos. No permitir invocación arbitraria de métodos
ni escritura libre de campos desde el navegador.

El decorador @action, ActionRecord y la firma record/context comentados en el chat
son ejemplos de diseño, no APIs disponibles ni sintaxis definitiva. Al retomar,
definir primero el contrato del método, su publicación y adaptador, permisos,
resultado y relación con hooks/constraints; después implementar la coordinación
FormHeader/FormButton. Reutilizar el ciclo existente sin duplicar hooks.
Este pendiente no autoriza crear Ventas ni añadir estados/acciones a Flota.

## API ilustrativa acordada

```tsx
<ModelForm config={config} id={id}>
  <FormHeader>
    <FormButton action={confirmarVenta}>
      Confirmar
    </FormButton>

    <FieldSelect<Values> name="estado" widget="statebar" />
  </FormHeader>

  <FormGroup legend="Datos de la venta">
    {/* Fields */}
  </FormGroup>
</ModelForm>
```

Es una propuesta de consumo, no código disponible. Ventas todavía no existe.
Preferencia por componentes independientes FormHeader/FormButton, coherentes con
FormGroup/Stack, en lugar de exigir Form.Header. FormHeader coloca botones y el
Field de estado en la cabecera dentro del contexto RHF. Preservar la distribución
de acciones principales y estado, Guardar/Revertir y el menú general existente.
El statebar sigue siendo de consulta por defecto.

FormButton debe aceptar invisibilidad/condiciones React y reutilizar el estado del
formulario (dirty, busy, readOnly), sin repetir ese control en cada vista. El diseño
debe permitir que componentes hijos usen useFormContext/useWatch; el ejemplo de
callback de FormHeader con ese contexto es una alternativa discutida, no una
segunda API obligatoria ni ya implementada.

## Secuencia predeterminada del botón

1. Un único bloqueo cubre todo el proceso, incluidos clics repetidos, otros botones
   y Guardar. Usar type="button" para evitar submits dobles. Respetar modo de
   consulta y el estado de la navegación/cambios pendientes.
2. Ejecutar primero el ciclo del formulario: esperar las reacciones pendientes y
   sus errores, validaciones RHF/Zod y auxiliares, y el guardado normal si es nuevo
   o tiene cambios. Reutilizar FormView/ModelForm y sus hooks de servidor; no crear
   otro pipeline ni disparar requestSubmit sin esperar su resultado.
3. Si el formulario rechaza validación/guardado, detenerse. La acción del botón no
   se invoca y el borrador/errores se conservan.
4. Sólo tras éxito, ejecutar la acción propia del botón con el ID y la revisión
   recién persistidos. Un registro existente sin cambios puede reutilizar su
   identidad vigente, sin escritura redundante, conservando la validación.
5. Procesar el resultado autorizado del servidor. En éxito, actualizar los valores
   RHF y la identidad/revisión, auditoría y displayName cuando corresponda. En
   fallo, mostrar los errores y conservar el estado correcto; liberar el bloqueo
   siempre. Evitar redirects, remounts u onSaved prematuros al crear que impidan
   ejecutar la acción o la ejecuten dos veces.

La separación acordada es **ciclo del formulario → acción del botón**, sin necesitar
saveBefore en cada botón. El contrato exacto de action y del resultado compartido
se debe tipar al implementar. Pasar referencias explícitas a Server Actions, nunca
nombres arbitrarios de métodos que el navegador pueda ejecutar remotamente.

## Servidor, fallos y persistencia

Guardar y ejecutar la acción son dos operaciones secuenciales; no hay rollback
automático del guardado si falla la acción posterior. En ese caso, el formulario
debe conservar el registro ya guardado y su revisión nueva, sin volver a la
identidad antigua ni presentar la acción como exitosa. No reintentar a ciegas una
mutación con resultado de red desconocido.

Cada acción de negocio debe autorizar al actor, verificar ID/revisión y transición
válida dentro de su transacción, y devolver el resultado canónico. El botón no
autoriza por estar visible ni sustituye reglas de negocio. No crear una acción
genérica que permita escribir cualquier estado/campo o saltarse hooks y constraints.
Una operación que necesite guardar y confirmar atómicamente requiere un contrato
de servidor específico; esa atomicidad no forma parte de esta coordinación UI.

## Criterios de aceptación

- La acción de negocio se define en la clase del modelo. El adaptador no repite
  esa lógica; métodos no publicados se rechazan. Probar permisos/sesión, revisión
  obsoleta, transición inválida, rollback de la acción y resultado canónico con
  revisión/historial, preservando el guardado previo si la acción falla.
- FormHeader funciona en ModelForm y se integra con FormView sin provider/form
  adicionales. El statebar lee RHF, y botones/Fields funcionan al personalizar TSX.
- Registro nuevo: validar, guardar y ejecutar exactamente una vez con ID/revisión
  nuevos. Registro modificado: la acción recibe la revisión posterior al guardado.
  Registro limpio: no se escribe de nuevo por defecto.
- Errores locales, reacciones pendientes/fallidas o guardado rechazado impiden la
  acción. Fallo de acción después de guardar conserva el registro guardado.
- Clics repetidos/acciones simultáneas se bloquean durante toda la cadena; errores
  de red no producen éxito aparente ni reintento automático de una mutación.
- Mantener alertas/errores por campo, guard de navegación, historial, auditoría,
  displayName, creación, recarga, eliminación y acciones actuales compatibles.
- Demo RHF/Zod en /sample con datos ficticios, sin modificar registros de Flota
  ni crear Ventas. Probar éxito, errores de cada fase, identidad/revisión, doble
  clic, modo consulta y navegación al crear. Checks proporcionales al cambio.
- Actualizar guías y continuidad antes de retomar Flota. Adaptar aplicaciones sólo
  en un ejercicio acordado con el usuario; no adelantarlas durante la implementación.

## Referencias para implementar

- `src/components/ui/form/FormView.tsx` y `FormView.md`.
- `src/components/ui/form/FormLayout.tsx`, reacciones y validadores auxiliares.
- `src/components/modules/ModelForm.tsx` y acciones de módulos.
- `src/app/sample/FormViewSample.tsx`: Confirmar/Cancelar como ejemplo existente
  sin persistencia; no confundirlo con un flujo completo de Ventas.
