# Campos calculados virtuales

Implementados el 2026-11-12. El modelo declara un Field de lectura y un método;
React presenta el resultado con los Fields existentes. Se reutilizan los contratos
de lectura y el motor autorizado de reacciones.

```ts
class Linea extends Model {
  cantidad = Fields.Integer({ required: true });
  precio = Fields.Integer({ required: true });
  total = Fields.Integer({ label: "Total", compute: "calcularTotal", required: true });

  @depends("cantidad", "precio")
  calcularTotal(values: ReactionValues) {
    return Number(values.cantidad ?? 0) * Number(values.precio ?? 0);
  }
}
```

`Fields.Integer`, `Fields.Text` y `Fields.Image` admiten compute. Un método para
un solo Field devuelve el escalar. Si varios Fields comparten método, éste devuelve
un objeto con exactamente sus nombres y valores, sin omitir ni añadir salidas.
Los resultados se validan con sus schemas, incluidos Int de 32 bits y URLs HTTPS.
El ejemplo usa precios enteros; no introduce Float ni un tipo monetario persistido.

## Dependencias y servidor

Usar `@depends("cantidad", "precio")` o `@depends({ fields: [...] })`, sin repetir
preview/writes: sus outputs se infieren de los Fields compute. También se admite
registro explícito de lectura con método/dependencias; mantener uno por método.
Un override debe volver a declarar su decorador, igual que las reacciones actuales.
Sin override, Fields y métodos se heredan normalmente.

El método recibe sólo sus dependencias en una copia congelada y el contexto de
reacciones; puede ser async. En un borrador incompleto puede recibir null/undefined:
debe representarlo con una salida válida o rechazar el cálculo. No recibe todo
el formulario. Métodos ausentes, dependencias inexistentes/sensibles y salidas
duplicadas producen errores al declarar/generar el modelo.

Si la misma petición ejecuta onchange y compute activos, primero valida los patches
editables y después calcula sobre ese borrador efectivo. No dispara otras reglas
inactivas ni envía otra petición desde React; tampoco crea una cascada entre cálculos.

La acción real usa recordService.react, con sesión/admin revalidados, revisión si
hay ID, y transacción RepeatableRead readonly. No hacer efectos externos ni usar
otro Prisma Client para eludirla. SQL readonly no es un sandbox para código JS.
Al guardar siguen mandando normalize, constraints, permisos y concurrencia del
servidor; no confiar en un cálculo enviado por el navegador.

## Vista y generación

```tsx
<FieldNumber mode="display" name="total" type="integer" direction="inline" />
<FieldText mode="display" name="resumen" />
```

Los controles heredan label de recordUI.readFields. Text/Number comparten
presentación de lectura, carga y error/reintento; no usan inputs ni useController.
Image usa su modo display existente. El frontend sólo formatea la presentación.

Compute no pertenece a clientFields, defaults, ModelInput/ModelValues, valores RHF,
esquema de guardado, auditoría ni Prisma. No acepta default, unique/tracking/sensitive
activos ni related simultáneo. required valida el resultado, no solicita captura.
Los schemas estrictos rechazan esos campos en el payload. No existe store aquí.

Se generan PreviewFields y ReactionRules, sin publicar métodos ni sus nombres.
Conectar readFields/reactions como en [Campos relacionados](campos-relacionados.md).
El scaffold nuevo genera controles display para Text, Integer e Image; conservar
las vistas personalizadas y editarlas explícitamente, sin regenerarlas.

Regenerar contratos con orm:generate -- app --write o usar orm:sync -- app.
Cambiar sólo compute no requiere SQL ni binding nuevo, mientras no cambien Fields
persistentes ni proyecciones related/display. Las dependencias deben estar publicadas.

## Alcance actual

Se consulta al abrir/resetear el formulario, cambiar una dependencia o reintentar.
Conserva debounce, agrupación, descarte de respuestas antiguas y espera de peticiones
antes de enviar. El preview no ensucia RHF; un error vigente bloquea el envío.

Los cálculos son virtuales: no columnas persistidas, inverse ni orden/búsqueda/
grupos SQL. Desde el 2026-11-15 también se proyectan por página autorizada en
colecciones. read/lookup no incorporan automáticamente estos valores.
Sólo depende de Fields locales persistentes, sin cadenas compute/related, ciclos
ni invalidación por cambios externos en relaciones. Agrupar fórmulas relacionadas
en un mismo método con varias salidas evita cascadas de frontend.

Demo RHF/Zod en /sample#model-reactions: total Integer y resumen Text calculados
en servidor, sin BD ni persistencia. Validar muestra sólo name/quantity/unitPrice
en el payload y sigue ejecutando las restricciones definitivas.

La siguiente etapa requiere diseñar invalidación y recomputación persistente
ante escrituras fuera del formulario y cambios relacionados; no se habilita aquí.

## Lista, Card y Kanban (2026-11-15)

Los módulos declarativos incorporan los Fields compute a la política de colección
por convención (`list: false` los excluye; se conserva el límite de columnas).
En una vista personalizada sólo se declara su presentación:

```tsx
<ModelCollection config={config} columns={[
  { field: "name" },
  { field: "kilometrosRestantes" },
]} />
```

No repetir la fórmula en React. El servicio obtiene la página autorizada y calcula
sobre las dependencias locales ya leídas por su repositorio. Reutiliza exactamente
el método @depends del modelo: sólo recibe sus dependencias declaradas en una copia
congelada y contexto con tx/actor/id del registro. Un método con varios outputs se
ejecuta una sola vez por registro y valida todos sus resultados; sólo salen los
campos publicados. No dispara onchange, constraints, normalize ni guardado.

La política exige publicar también las dependencias: no calcular salidas desde
campos sensibles o no publicados en la colección. Omitir una columna en el TSX no
retira su publicación de servidor. Contratos parciales deben incluir explícitamente
las dependencias o excluir el compute. Un DTO de repositorio que no traiga las
dependencias falla con error; no se simulan ceros o valores persistidos.

Se procesan sólo registros de la página (máximo 50 del servicio), con recorrido
acotado en lotes de hasta cien, sin consultas por registro añadidas por el framework.
Lista y Card comparten proveedor; Kanban conserva consulta/paginación por columna.
Las cabeceras agrupadas no calculan sumas ni agregados: el cálculo se hace al cargar
sus hojas. Se conserva autorización, dominio, revisión y etiquetas relacionadas.
La transacción que publica compute es RepeatableRead y READ ONLY antes de autorizar.
Un fallo rechaza la página completa y conserva el mecanismo de reintento habitual.

Los métodos deben ser de lectura y preferir fórmulas sobre dependencias locales.
Un método que consulta tx puede introducir sus propias consultas por registro:
no se vectoriza código arbitrario ni se autorizan otras entidades implícitamente.
READ ONLY protege esa transacción SQL, no efectos externos ni otro Prisma Client;
el código de modelo sigue siendo código local de confianza.

CollectionFields generado incluye compute como readOnly, separado de Fields,
defaults, valores RHF y schemas de guardado. Las apps con contratos generados deben
regenerarlos mediante su flujo orm habitual; vistas/política manuales publican las
salidas expresamente. Los módulos declarativos actualizan el contrato en runtime:
recargar para recogerlo; no hay SQL nuevo por este soporte.

No se habilitan filtros, búsqueda, orden ni agrupación por el virtual; la UI los
oculta y el servidor rechaza esas capacidades/peticiones. No hay store, inverse,
cadenas compute/related ni recomputación persistida.

Demo `/sample#computed-collections` con datos ficticios y el mismo método en las
tres presentaciones. Pruebas: test:orm incluye colección/publicación/contexto,
validación de resultados y ausencia de lecturas extra; test:modules comprueba
metadatos y capacidades. test:capabilities:integration usa PostgreSQL temporal,
incluye un compute real y verifica que una escritura desde éste se rechaza.

## Pendiente: store: true

El usuario pidió anotarlo el 2026-11-15 para retomarlo al llegar a un caso real.
Todavía no está disponible ni se implementa por esta nota. [Alcance y criterios](ideas/compute-persistido.md).
