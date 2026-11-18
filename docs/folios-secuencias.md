# Folios y secuencias de modelos

Implementado el 2026-11-17 para modelos declarativos `defineModule`. Se asignan
**al crear**, en el servidor y en la misma transacción que el documento. No hay
que escribir un beforeSave ni obtener `count() + 1`.

## Declaración

```ts
import { Fields, Model } from "@/lib/orm";

export class Ticket extends Model {
  name = Fields.Text({
    label: "Folio",
    sequence: {
      prefix: "TCK-{year}-",
      padding: 6,
      reset: "year",
    },
  });

  descripcion = Fields.Text({ label: "Descripción", required: true });
}
```

El primer folio de 2026 será `TCK-2026-000001`. `name` conserva la convención de
presentación del framework: listas, breadcrumbs y lookups reutilizan displayName,
que por defecto usa name. No se necesita un segundo campo para copiar el folio.
También puede declararse en otro Text: el contador se identifica por
`<nombrePrismaDelModelo>.<campo>` y es independiente por campo/modelo.

| Opción | Predeterminado | Contrato |
| --- | --- | --- |
| `prefix` | `""` | Hasta 60 caracteres, sin controles ni espacios externos; único token: `{year}`. |
| `padding` | `6` | De 1 a 12. Es un ancho mínimo, sin truncar números mayores. |
| `reset` | `"none"` | `none` mantiene una serie; `year` separa contadores por año UTC y exige `{year}` en el prefijo. |

El descriptor implica `required: true`, `unique: true` y `readOnly`. No admite
required/unique false, default propio, sensitive, compute, related, minLength ni
trim false. `maxLength`, si se declara, debe permitir el formato; si el número
crece más allá de ese límite, se rechaza el guardado y se revierte el contador.

## Borrador, guardado y vistas

- El default es `""`. ModelForm muestra «Nuevo» mediante el placeholder de FieldText,
  mantiene el input de sólo lectura y permite validar el resto del borrador.
- ModelForm y las vistas generadas por eject:view heredan el comportamiento sin
  props adicionales. `readOnly={false}` no vuelve editable un folio secuencial.
- El formulario usa `formSchema`/`fieldInputSchema`, que admiten folio vacío o null
  en el borrador. El descriptor `.schema` y `defineModel.schema` siguen siendo
  estrictos para el valor persistido. Para un formulario manual, usar FormLayout
  con los Fields como `model.fields` y `fieldInputSchema(field)` en su Zod de entrada.
- Una creación acepta el campo omitido, `""` o null; un folio proporcionado por el
  cliente se rechaza antes de los hooks. El servidor rellena el valor antes de
  normalize/beforeSave/constraints, que pueden leerlo, pero no reemplazarlo.
- En edición se conserva el valor anterior. La API admite su omisión y lo restaura;
  si se envía otro valor o null, rechaza. Acciones y Kanban tampoco lo renumeran.
- Se compara tras normalize, beforeSave y la lectura final posterior a afterSave.
  Un hook que modifica el folio revierte toda la transacción. Esto protege el
  flujo del ORM; no es un trigger que impida escrituras SQL externas.

## Contador compartido y concurrencia

La infraestructura `ModelSequence` vive en `model_sequences`, con clave compuesta
`(key, period)`, contador PostgreSQL BIGINT y hash de configuración. No es un módulo,
no tiene rutas/lookup ni publica sus valores como campos del documento.

Cada alta usa un upsert/increment atómico dentro de la transacción Serializable
existente. La columna del documento también tiene un índice unique. Si PostgreSQL
aborta por concurrencia (P2034), el guardado raíz de un modelo con secuencia puede
repetir la transacción hasta cinco intentos. No se repiten errores de red, commits
inciertos, conflictos de unicidad ni otras mutaciones. Una contención persistente
sigue devolviendo el error habitual de concurrencia para reintentar desde la UI.
Los hooks pueden ejecutarse de nuevo: sigue vigente la prohibición de efectos
externos dentro de beforeSave/afterSave; no son afterCommit.

Validaciones, permisos, hooks, escritura de líneas/vínculos e historial comparten
la transacción: si falla, también se revierte el incremento. La autorización del
actor ocurre antes de asignar. Una edición no consulta ni incrementa el contador.

Los contadores no se borran al retirar/purgar un módulo. Borrar o cancelar un
registro no recicla su folio. No se promete una serie sin huecos ni numeración
fiscal/legal: esos requisitos necesitan reglas adicionales del negocio.

## Migración y evolución

La migración del framework `20261117233000_add_model_sequences` crea únicamente
la tabla de contadores. Después de revisar y aplicar las migraciones pendientes,
generar Prisma Client y reiniciar dev. Para el campo del módulo, seguir el flujo
habitual `npm run orm:sync -- <modulo>` y revisar su SQL.

**Estado local Mac al implementar:** migrate status encontró pendientes
`20261117154411_sync_flota`, `20261117190856_uninstall_flota` y la nueva migración.
La de retirada elimina las tablas de Flota. No se aplicó SQL en el ERP: revisar
expresamente ese historial y los datos de esta máquina antes de ejecutar deploy.
No marcar migraciones como aplicadas ni crear la tabla a mano para saltarlas.

El formato queda protegido por hash para cada clave/período ya utilizado. Cambiarlo
requiere una migración controlada del contador y revisión de unicidad; no hay UI
ni comando para resetearlo. Cambiar de nombre el modelo/campo cambia la clave:
no hacerlo para reiniciar una serie. Adoptar sequence sobre datos existentes no
los renumera ni infiere el último número desde name; hay que planear ese traspaso
para evitar colisiones con folios anteriores. La actualización aditiva puede
rechazar cambios de nulabilidad/unique y requerir revisión adicional del esquema.

## Alcance inicial

- Creación automática, serie por modelo/campo y reinicio anual UTC opcional.
- Sin asignación diferida al confirmar, series por empresa/sucursal, token de mes,
  zona horaria configurable, prefijos calculados, importación de folios históricos
  ni edición/reset de contadores desde el navegador.
- Sin sequence añadido desde extendModel ni bindings del scaffold legacy; se
  rechazan explícitamente. Una extensión de un modelo con folio conserva su serie.
- Un folio puede leerse en constraints, hooks, métodos y cálculos locales; onchange
  no puede declararlo como salida editable ni reservar números desde el borrador.

## Demostración y pruebas

`/sample#model-sequences` integra RHF/Zod y FieldText con metadatos. La Server Action
simula siempre el primer número del año UTC: **no incrementa contadores ni guarda
registros del ERP**. Nuevo ejemplo vuelve al borrador vacío «Nuevo».

```bash
npm run test:orm
npm run test:form-model
npm run test:sequences:integration
```

La integración instala un módulo ficticio en proyecto/esquema PostgreSQL temporales,
verifica SQL/unique, dos campos independientes, año UTC, cinco altas concurrentes,
edición/acciones, valores falsificados, rechazos antes/después del guardado,
conservación de contadores al borrar, cambios de formato, permisos, rollback,
eject:view y TypeScript. Elimina sus recursos al terminar.
