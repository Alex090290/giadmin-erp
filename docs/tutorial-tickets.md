# Tickets: aprender el framework desde cero

Guía preparada el 2026-11-17. **Estado: ejercicios 0–3 completados; ejercicio 4
en curso, hasta requiereVisita incluido.** El módulo Tickets ya está creado e
instalado. El usuario escribe sus archivos y ejecuta los pasos; el agente explica,
revisa y acompaña un ejercicio a la vez, sin editar su aplicación por adelantado.
El punto de continuación al final de esta guía prevalece sobre los pasos iniciales.

El objetivo es construir una mesa de ayuda interna: registrar un problema,
clasificarlo, asignarlo, documentar las intervenciones y cerrarlo con una solución.
El recorrido comienza con un solo modelo y termina con relaciones, negocio,
seguridad, personalización y evolución modular. No exige experiencia previa con
este framework; sí conocimientos básicos de TypeScript y React.

## Cómo seguiremos la tutoría

Cada ejercicio tiene cinco momentos: explicar el concepto, localizar el archivo,
hacer un cambio pequeño, comprobar el resultado y registrar el avance. «Listo»
significa revisar ese paso y proponer el siguiente; no saltar varias fases ni dar
por comprobado un resultado sólo porque se escribió el código.

Los fragmentos posteriores al arranque son referencias del recorrido, no un módulo
completo para pegar de una vez. Antes de cada ejercicio se dará el código concreto
que corresponda a los archivos que el usuario tenga entonces.

Cuando aparezca repetición o una API incómoda, anotaremos el caso y el criterio de
mejora. Una pieza ausente se diseña y se aprueba antes de implementarla. Las pruebas
del framework usan recursos temporales, separados de los registros de práctica.

## 0. Entender las piezas y preparar el entorno

| Pieza | Para qué sirve |
| --- | --- |
| Clase `Model` | Declara campos, reglas, cálculos y métodos de negocio del servidor. |
| `Fields` | Define tipos, validaciones, defaults y metadatos compartidos. |
| `manifest.ts` | Registra modelos, menús, vistas, dependencias y accesos del módulo. |
| `src/modules/index.ts` | Registro explícito de módulos disponibles en ejecución. |
| Prisma y PostgreSQL | Ejecutan consultas y almacenan datos; las migraciones cambian su estructura. |
| `ModelForm` / `ModelCollection` | Conectan el contrato autorizado con formularios y colecciones. |
| TSX personalizado | Decide maquetación y presentación cuando la convención no basta. |
| React Hook Form y Zod | Administran el borrador y validan; el servidor vuelve a validar. |

Usaremos **módulos declarativos en `src/modules`**. No mezclaremos el recorrido con
el scaffold anterior de `create:app`, `orm.config.ts`, `clientFields`, bindings o
`create:views`. Esas herramientas siguen existiendo para aplicaciones anteriores.

Antes de comenzar:

1. Leer esta introducción, [AGENTS.md](../AGENTS.md) y el
   [estado vigente](estado-proyecto.md). Comprobar rama y cambios locales.
2. Tener dependencias instaladas y PostgreSQL de desarrollo disponible. Usar la
   `.env.local` existente sin copiar secretos a documentación o al chat.
3. Revisar las migraciones pendientes antes de sincronizar. En la última revisión
   de esta Mac quedaban migraciones de Flota, incluida una retirada que elimina
   tablas, y la infraestructura de folios. El estado puede variar por máquina:
   comprobarlo, no aplicar esas migraciones como efecto colateral del tutorial.
4. Resolver ese punto de partida con una revisión específica antes del primer
   `orm:sync`. No usar `db:deploy`, reset ni `--force` para saltarse la revisión.
5. Iniciar `npm run dev` si no está ejecutándose. No levantar dos servidores.

**Comprobación:** sabemos qué conexión de desarrollo usamos, qué migraciones hay
pendientes y qué hace cada capa. No hemos creado Tickets ni ejecutado SQL.

## 1. Crear el módulo vacío

Desde la raíz del repositorio, ejecutar y revisar primero el plan:

```sh
npm run create:module -- tickets --dry-run
```

Después de comprobar los archivos propuestos:

```sh
npm run create:module -- tickets
```

Leer `src/modules/tickets/manifest.ts` y el cambio en `src/modules/index.ts`.
Personalizar nombre, descripción e icono. Un módulo vacío todavía no tiene una
pantalla útil ni tablas: eso es lo esperado.

**Comprobación:** el manifest y su import están registrados, sin crear modelos
manualmente ni tocar Prisma. [Referencia](modulos-declarativos.md#1-declarar-el-módulo).

## 2. Crear y comprender el primer modelo

```sh
npm run create:model -- tickets Ticket --dry-run
npm run create:model -- tickets Ticket
```

Abrir `src/modules/tickets/models/ticket.ts`. Identificar imports, clase, `name`,
`active` y método de presentación generado. Leer el registro `ticket` del manifest.

Aprender `label`, `required`, `maxLength`, `default` y la diferencia entre un valor
vacío y un valor válido. Antes de la primera instalación, preparar sólo dos textos:
`asunto` obligatorio y `name` como folio. Así no habrá que convertir nombres ni
renumerar registros después de guardar los primeros datos:

```ts
name = Fields.Text({
  label: "Folio",
  sequence: { prefix: "TCK-{year}-", padding: 6, reset: "year" },
});
asunto = Fields.Text({ label: "Asunto", required: true, maxLength: 160 });
```

Por ahora basta entender que el asunto lo escribimos y el folio lo asigna el
servidor al guardar. Conservaremos `active` y el displayName generado. El ejercicio
5 profundiza en la secuencia. No añadir todavía relaciones ni estados.

| Identidad | Valor esperado por convención |
| --- | --- |
| Módulo | `tickets` |
| Clave del modelo | `ticket` |
| ID público | `tickets.ticket` |
| Nombre Prisma | `TicketsTicket` |
| Tabla | `tickets_ticket` |
| Colección | `/erp/tickets/ticket` |
| Alta | `/erp/tickets/ticket/nuevo` |

**Comprobación:** podemos explicar esos nombres sin confundir la clase TS con la
ruta o la tabla. No ejecutar `create:views`; ya hay lista y formulario por convención.

## 3. Sincronizar y guardar el primer ticket

Con el punto de partida de migraciones resuelto:

```sh
npm run orm:sync -- tickets --plan
npm run orm:sync -- tickets
```

Leer el SQL que muestra la terminal antes de escribir `aplicar`. Si el comando
falla, leer el paso indicado y corregirlo; los pasos completados no se revierten
automáticamente. Cuando cambie Prisma Client, detener dev con Ctrl+C en su terminal
y volver a ejecutar `npm run dev`.

Abrir el módulo como administrador y crear, editar y reabrir un ticket. Probar un
asunto vacío, Revertir y salir con un borrador pendiente. Identificar el registro
persistido frente al estado local del formulario.

**Comprobación:** existe persistencia real, se conserva la edición al reabrir y un
rechazo no pierde el borrador. [Sincronización](sincronizar-aplicaciones.md).

## 4. Ampliar los campos, poco a poco

Añadir en ejercicios separados:

| Campo | Tipo / propósito |
| --- | --- |
| `descripcion` | Text largo, opcional al principio. |
| `prioridad` | Selection: baja, normal, alta; default normal. |
| `estado` | Selection obligatoria: nuevo, enProceso, enEspera, resuelto, cerrado. Default nuevo. |
| `estimacionMinutos` | Integer no negativo con default 0. |
| `presupuestoMinutos` | Integer no negativo con default 120. |
| `requiereVisita` | Boolean con default false. |
| `compromisoAt` | DateTime opcional: un instante, no una fecha sin hora. |

Revisar las opciones válidas en [Fields](modelos-typescript.md), sin copiar límites
antiguos de ese documento como si describieran todo el módulo declarativo actual.
Elegir qué campos publicar en colecciones mediante `list`, `searchable`,
`sortable`, `filterable` y `groupable`. No publicar todo por comodidad: el máximo
compartido es 12 columnas y los campos largos normalmente tendrán `list: false`.

Sincronizar cada cambio persistente y revisar su SQL. Añadir un campo obligatorio
a una tabla con registros requiere un default SQL compatible o una evolución
revisada. Un Integer representa minutos enteros; no usarlo para simular dinero.

**Comprobación:** defaults y límites funcionan al crear y editar. Podemos explicar
por qué DateTime se guarda en UTC y por qué su presentación usa una zona horaria.

## 5. Folio y nombre de presentación

Volver a la declaración de `name` preparada en el ejercicio 2. Explicar prefix,
padding, reset anual y por qué no usamos `count() + 1`. La infraestructura
`ModelSequence` y el campo ya deben estar instalados; este ejercicio no necesita
cambiar el esquema ni renumerar datos. No modificar el formato de una serie en uso
sin revisar su contrato y la estrategia de evolución.

Primero conservar `displayName` devolviendo el folio; después personalizarlo para
mostrar «folio · asunto», declarando ambas dependencias. Comparar formulario,
breadcrumb, título de pestaña, colección y lookup. El método devuelve una etiqueta,
no crea otra columna ni consulta desde React.

**Comprobación:** un alta muestra Nuevo antes de guardar; el servidor asigna el
folio, editar no lo cambia y dos altas no comparten número. La serie anual usa UTC.
[Folios](folios-secuencias.md) · [Presentación](nombres-presentacion.md).

## 6. Catálogos y Many2one

Crear primero un catálogo y probarlo antes del siguiente:

```sh
npm run create:model -- tickets Categoria
npm run create:model -- tickets Tecnico
```

`Categoria` tendrá nombre y minutos recomendados; `Tecnico`, nombre y activo.
Estos técnicos son **registros de catálogo**, todavía no cuentas de usuario.
Registrar menús con `menu` y un grupo vertical Configuración para los catálogos.
El manifest declarativo usa objetos anidados, no la API `menus/items` del scaffold
anterior; sólo admite un nivel de grupo.

En Ticket añadir `categoriaId` y `tecnicoId` como Many2one a `TicketsCategoria` y
`TicketsTecnico`. Sincronizar y probar búsqueda, selección, limpieza y reapertura.
Personalizar el displayName del destino y comprobar que el selector lo reutiliza.
En backend el valor de una Many2one es un ID, no el objeto completo seleccionado.

**Comprobación:** no escribimos otro label ni consultas de frontend para el lookup.
Probamos también el filtro textual de Many2one en la lista. User/Partner manuales
requieren una integración autorizada propia; no fingir que el catálogo da permisos.

## 7. Normalización, hooks y restricciones

Aplicar una regla por ejercicio, ubicándola en la capa correcta:

1. `normalize`: limpiar el asunto de forma pura e idempotente, sin consultas.
2. `beforeSave`: aplicar una decisión que requiera actor, transacción o estado
   anterior. Consultar únicamente columnas necesarias y autorizar las referencias.
3. Añadir primero un Text `resolucion` opcional y sincronizar. Con `@constraint`,
   impedir cerrar sin resolución y exigir técnico al entrar en
   proceso. Debe proteger también guardados directos y movimientos, no sólo botones.
4. `context.previous`: impedir cambios de ciertos datos después del cierre.
5. `afterSave`: estudiar cuándo sería necesario y provocar un rechazo controlado
   para comprobar rollback; no añadir un hook sin necesidad funcional.

Conservar `...values` al transformar datos. Emitir ModelValidationError con errores
por campo cuando corresponda. Readonly e invisible en React no protegen la BD:
un dato calculado persistente necesita una regla de servidor y una política de
entrada adecuada. No declarar `store: true`: sigue pendiente.

**Comprobación:** el error conserva el borrador y un fallo tardío no deja escrituras
parciales. [Ciclo](ciclo-modelos.md) · [Restricciones](reacciones-modelos.md).

## 8. Reacciones, related y compute

Tres ejercicios distintos, sin duplicar responsabilidades:

- `@onchange`: al seleccionar categoría, proponer `estimacionMinutos` desde sus
  minutos recomendados. Es ayuda del borrador; permitir el ajuste manual y no
  confundirlo con una regla obligatoria del guardado.
- `related`: mostrar el nombre de la categoría como Text de lectura. Más adelante,
  mostrar también la imagen del equipo relacionado, sin una consulta manual.
- `compute` + `@depends`: calcular `margenMinutos` como presupuesto menos estimación,
  usando sólo esas dependencias locales persistentes.

Dejar una restricción definitiva si el margen debe impedir un guardado. Mostrar
compute/related con Fields `mode="display"`; no añadirlos al payload editable.
Probar su presentación en lista, card y kanban. Son virtuales: no habilitar filtros,
orden ni agrupación SQL sobre esas salidas. No calcular sobre arrays de líneas o
Many2many con una API de dependencias que todavía no lo admite.

**Comprobación:** el borrador reacciona, las respuestas antiguas no pisan cambios
recientes y modificar otro registro no supone una actualización en vivo automática.
[Reacciones](reacciones-modelos.md) · [Related](campos-relacionados.md) ·
[Compute](campos-calculados.md).

## 9. Diseñar el formulario con TSX

Sólo ahora expulsar la vista, revisando primero el plan:

```sh
npm run eject:view -- tickets ticket form --dry-run
npm run eject:view -- tickets ticket form
```

Leer el archivo generado antes de editarlo. Mantener su envoltura ModelForm y sus
conexiones de carga, guardado, actividad, eliminación y navegación. Aprender el
contrato de `FormValues<typeof Ticket>` y las importaciones `type` del modelo.

Distribución propuesta: folio/asunto con FieldText `widget="header"`, FormHeader
con acciones y estado `widget="statebar"`, FormGroup para clasificación y
planificación, Stack dentro de un grupo, y Notebook con Descripción e
Intervenciones. Stack usa su contrato `direction="block"`. Practicar Text long,
número, booleano y fecha; etiquetas/metadatos se heredan del modelo.

Con `useWatch`, condicionar visibilidad o lectura de un control al estado o a
`requiereVisita`. Comparar con `invisible` declarado en el modelo. Un campo oculto
sigue validándose; condicionar presentación no concede ni revoca permisos.
Mantener autocomplete off, labels inline a la izquierda y páginas del Notebook
montadas. Las páginas no necesitan repetir bordes, padding ni títulos de la tabla.

**Comprobación:** los errores revelan la pestaña correcta, guardar bloquea el
formulario con indicador discreto y salir con cambios pide confirmación.
[Contrato FormView](../src/components/ui/form/FormView.md) · demos `/sample`.

## 10. List, Card y Kanban con un solo núcleo

Registrar alternativas en `views` del modelo: `list: true`, `card: true`,
`kanban: true`, conservando el loader form. Configurar `kanban` con el Field estado.
Elegir la inicial mediante `view`. No construir tres servicios de consulta.

Probar primero las presentaciones por convención. Luego expulsar una cada vez:

```sh
npm run eject:view -- tickets ticket list
npm run eject:view -- tickets ticket card
npm run eject:view -- tickets ticket kanban
```

Personalizar ModelCollection con columnas publicadas y widgets; después practicar
`renderCell` o `renderCard` en una vista cliente. Mostrar prioridad con badge y
fechas formateadas, sin trasladar fórmulas de negocio al renderer.

Ejercitar búsqueda con Enter/Buscar, filtros, chips, orden, agrupación anidada y
paginación. Cambiar presentación, abrir un registro y volver conservando consulta.
Probar selección individual/múltiple y Eliminar en Acciones; distinguir quitar una
capacidad de UI (`create={false}`, `delete={false}`, `movable={false}`) de denegarla
en servidor. No agrupar por rutas de relaciones o periodos de fecha no soportados.

**Comprobación:** todas presentan registros autorizados del mismo modelo. Kanban
carga cada columna por separado, con sus conteos; no filtra una página en React.
[Colecciones](colecciones-modelos.md) · [Agrupación](agrupacion-listas.md).

## 11. Botones y transiciones de negocio

Declarar acciones pequeñas: iniciar, poner en espera y resolver. Retornar patches
desde métodos `@action`; usar ActionRecord y errores de negocio. Colocar FormButton
en FormHeader y usar visibilidad por estado como ayuda visual.

Configurar después el grafo Kanban `from/to/action`, reutilizando esas acciones.
Una transición no declarada se rechaza; la regla de negocio debe ser válida aunque
el estado llegue desde otro canal de guardado. Probar el conflicto de revisión en
dos pestañas, grupos de acción y errores sin dar por guardado un movimiento fallido.

**Comprobación:** guardar y ejecutar son pasos ordenados. **No son una sola
transacción:** si el guardado previo tuvo éxito y la acción falla, ese guardado
permanece; la transacción de la acción sí revierte su propio trabajo.
[Acciones y Kanban](modulos-declarativos.md#6-acciones-del-modelo).

## 12. Acciones con parámetros

Implementar Cerrar con nota de resolución y Reasignar con `TicketsTecnico`.
Referencia de la firma que practicaremos:

```ts
const cierre = {
  nota: Fields.Text({ label: "Resolución", required: true, maxLength: 2000 }),
};

// Dentro de Ticket; importar action, ActionRecord y ActionParams desde @/lib/orm.
@action({ label: "Cerrar", params: cierre })
cerrar(record: ActionRecord<Ticket>, params: ActionParams<typeof cierre>) {
  if (record.estado !== "resuelto") {
    throw new ModelValidationError("Primero resuelve el ticket.");
  }
  return { estado: "cerrado", resolucion: params.nota };
}
```

Reutilizar `resolucion`, declarado en el ejercicio 7. El diálogo tiene RHF propio; nota no es un
campo editable del documento hasta que el método devuelve su patch. Probar cancelar,
validación local, ActionParameterError, conservación de argumentos y reintento.
Parámetros: máximo 8, escalares y Many2one declarativo; sin imágenes o colecciones.

**Comprobación:** cancelar no guarda ni ejecuta. Confirmar valida, guarda si hace
falta y ejecuta; un cierre con nota **no** puede ser transición de arrastre Kanban,
porque allí no hay diálogo de parámetros. [Contrato](acciones-parametros.md).

## 13. Auditoría, historial y notas internas

Identificar `createBy`, fechas y revisión; ninguno es editable desde el formulario.
Activar `tracking` sólo donde aporte información y comparar borrador con cambio
persistido. Publicar una nota interna y revisar autor/avatar en la columna derecha.

**Comprobación:** editar no cambia al creador, cancelar no registra actividad y un
rollback no deja entradas de historial. El historial no sustituye un modelo de
intervenciones ni un servicio externo de notificaciones.
[Auditoría](auditoria-modelos.md) · [Actividad](actividad-registros.md).

## 14. One2many: intervenciones del ticket

Crear `Intervencion` con trabajo realizado, fecha/hora, minutos y Many2one
`ticketId` obligatorio a `TicketsTicket`, `onDelete: "Restrict"`. En Ticket declarar
`intervenciones = Fields.One2many("TicketsIntervencion", { inverse: "ticketId", ... })`.
La elipsis es explicativa: en el ejercicio elegiremos label y maxRows concretos.

Sincronizar, comprobar primero el formulario por convención y después añadir
FieldOne2many con Column dentro de la pestaña Intervenciones. Reutilizar Fields;
Agregar línea va debajo, sin contador ni encabezado adicional. No usar modales.

Ejercicios: alta/edición/baja en borrador, cancelar, errores por celda, revisión de
una fila y una constraint del padre que compare la suma de minutos con su presupuesto.
La lógica del hijo corre en el guardado; la constraint agregada ve sus valores
canónicos. Quitar una fila sólo la elimina al guardar el padre.

**Comprobación:** un error revierte padre, hijos e historial. La edición independiente
del hijo respeta acceso al padre y avanza su revisión. No hay líneas paginadas,
anidamiento multinivel ni reacciones de celda automáticas todavía.
[Contrato y límites](lineas-one2many.md).

## 15. Many2many: etiquetas compartidas

Crear `Etiqueta`, sincronizar su catálogo y añadir a Ticket
`Fields.Many2many("TicketsEtiqueta", { label: "Etiquetas", maxSelected: 20 })`.
Revisar la tabla intermedia y probar FieldRelationTag con etiquetas dentro del
control, teclado, búsqueda y nombres largos.

**Comprobación:** dos tickets comparten una etiqueta; quitarla de uno elimina sólo
su vínculo. Borrar una etiqueta usada se restringe. Un destino no legible no se
descarta silenciosamente: puede bloquear la apertura/edición del documento.
No hay filtros, columnas ni compute sobre el arreglo; observadores User/Partner
quedan pendientes. [Contrato](relaciones-many2many.md).

## 16. Seguridad real: grupos, reglas y capacidades

Usar cuentas de prueba de desarrollo, sin alterar accesos reales como atajo.
Comenzar por tres grupos: consulta, operador y supervisor. Definir CRUD por modelo;
catálogos en lectura para operador y administración para supervisor. Asignar
usuarios desde la administración básica de Accesos, ya existente.

Primera regla: operador trabaja con tickets creados por su cuenta (`createBy`
igual a `actor.id`); supervisor tiene su regla de todos. Explicar global AND y OR
entre reglas de grupo antes de combinar condiciones. Probar sesión revocada,
acceso por URL directa, lista, lookup, acciones, historial, líneas y etiquetas.
**No comprobar restricciones usando sólo isAdmin:** tiene bypass de acceso.

La regla «técnico ve asignados» necesita vincular el catálogo Tecnico con la cuenta
autenticada. Diseñar explícitamente esa integración y sus consultas autorizadas;
no comparar `tecnicoId` con `actor.id`. Partner conserva los datos de contacto y
User las credenciales; no duplicar contactos en otro modelo. La integración con
modelos manuales no tiene todas las automatizaciones declarativas.

**Comprobación:** el servidor deniega operaciones manipuladas aunque se muestre un
botón. Formularios/colecciones consumen capacidades efectivas; ocultar un control
no crea permisos por campo. La visibilidad de menús aún tiene límites documentados.
[Accesos](modulos-declarativos.md#5-control-de-accesos) ·
[Capacidades](capacidades-modelos.md) · [Pendiente de campos](ideas/permisos-campos.md).

## 17. Dominios: una colección filtrada no es un permiso

Crear una consulta «Mis tickets abiertos», fijando en servidor creador y estados.
Compararla con una regla de acceso: cambiar un filtro no debe ampliar el alcance
autorizado. Elegir una acción de consulta fija; nunca recibir un where o actor desde
el navegador.

Este ejercicio es una integración avanzada: `defineListAction` pertenece al
servicio y ModelCollection admite CollectionSource. El manifest declarativo no
ofrece hoy un `domain` por menú ni genera esas rutas automáticamente. Prepararemos
el wrapper/ruta y el proveedor autorizado necesarios, conservando reglas y
paginación; no pegar archivos del scaffold anterior como si ya existieran aquí.

**Comprobación:** dominio, búsqueda y filtros se combinan con los permisos. La
fuente personalizada no mezcla mutaciones por defecto sin un contrato explícito.
[Dominios](dominios-listas.md) · [CollectionSource](colecciones-modelos.md).

## 18. Dependencias, imágenes y extensión de otro módulo

Crear un módulo auxiliar **recursos**, modelo **Equipo**, con nombre, activo e
imagen. Este catálogo tiene un caso real: el equipo sobre el que se abre un ticket.

```sh
npm run create:module -- recursos
npm run create:model -- recursos Equipo
# Personalizar y revisar el plan antes de sincronizar.
npm run orm:sync -- recursos
```

Añadir `depends: ["recursos"]` a Tickets y una Many2one a `RecursosEquipo`.
Sincronizar Tickets. Configurar las credenciales de imágenes sólo según el contrato
vigente, fuera de Git; distinguir Image editable/upload de Image related/display.
Mostrar la imagen del equipo con `related: "equipoId.imagen"`, avatar y miniatura
en tarjetas. Probar falta de lectura del destino: no publicar sus datos derivados.

Después extender `recursos.equipo` **desde Tickets** con `extendModel`: por ejemplo,
ubicación de soporte y una acción de marcar para revisión. No editar la clase base.
Encadenar hooks con `super`, conservar campos ajenos y observar tabla compañera,
revisión compartida y ModelExtensions en el formulario personalizado.

Practicar campos extendidos en colección/filtros/agrupación, un formulario de
extensión propio y la diferencia entre defaults al abrir y null SQL cuando aún
no existe fila compañera. No tratar la extensión como un modelo con CRUD separado.

**Comprobación:** Recursos funciona solo; Tickets amplía su comportamiento sin
duplicarlo. No retirar Recursos mientras Tickets dependa de él. Partner/User aún
no admiten esta extensión. [Herencia](modulos-declarativos.md#7-extender-un-modelo-de-otro-módulo-herencia) ·
[Imágenes](ideas/campos-imagen.md).

## 19. Recuperación, evolución y ciclo de vida

Revisar sin romper datos: fallo de carga y Reintentar, respuesta antigua descartada,
error de guardado, revisión desactualizada, eliminación restringida por líneas y
retorno seguro a la colección. Las demos `/sample#collection-core` y
`/sample#action-parameters` permiten provocar errores sin desconectar la BD.
No reintentar automáticamente acciones o guardados con resultado incierto.

Añadir un campo a una vista ya expulsada: la clase no reescribe ese TSX. Editar sólo
su presentación, conservando el contrato heredado. Comparar un cambio de negocio,
uno persistente y uno de diseño usando la chuleta siguiente.

Finalmente visitar Módulos: catálogo, estado, dependencias y plan de actualización.
Estudiar conservar datos frente a purgar, respaldo, mantenimiento y reactivación.
La retirada será un ejercicio separado, expresamente autorizado y revisado; no se
ejecuta como limpieza automática del tutorial. Tampoco desplegaremos a producción
antes de resolver la estrategia de entornos.

**Comprobación:** sabemos qué versionar (fuentes, esquemas, propiedad y migraciones)
y qué no viaja por Git (secretos, BD, procesos y archivos locales de recuperación).
[Gestor](gestor-modulos.md) · [Entornos pendientes](ideas/entornos-bases.md).

## Chuleta de comandos y decisiones

| Qué cambié | Qué hago después |
| --- | --- |
| Quiero otro módulo | `create:module -- id`, primero con `--dry-run`. |
| Quiero otro modelo | `create:model -- id Clase`; personalizar, sincronizar y probar. |
| Campos persistentes, relaciones o extensión persistente | `orm:sync -- id --plan`, luego `orm:sync -- id`; revisar SQL y reiniciar dev cuando cambie Prisma. |
| Sólo normalize, constraints o cuerpo de una acción | Probar el comportamiento; no requiere migración por sí solo. |
| Sólo TSX o widgets | Dev actualiza la vista; no ejecutar sincronización de BD por diseño. |
| Vistas alternativas por convención | Editar manifest; Kanban necesita configuración válida. |
| Quiero diseñar una vista | `eject:view -- id clave form/list/card/kanban`, una presentación cada vez, primero con `--dry-run`. |
| Vista ya personalizada | Editarla; eject no sobrescribe. `update:views`/`create:views` son del scaffold anterior. |
| Grupos, reglas, transiciones o metadatos | Revisar manifest y probar autorización; no implica SQL si no cambian campos. |

Los comandos con `id`, `Clase` o `form/list/card/kanban` son plantillas: sustituirlos
por un identificador, una clase o un único tipo de vista. No ejecutar todas las
suites por cada etiqueta cambiada. Usar TypeScript/ESLint y pruebas del concepto;
las integraciones con BD crean sus propios recursos según la guía correspondiente.

## Cobertura y temas que no prometemos todavía

| Capacidad actual | Ejercicios |
| --- | --- |
| Generadores, registro, Prisma, migraciones y convención | 0–4, 19 |
| Text/Integer/Boolean/Selection/DateTime/Image y metadatos | 4, 9, 18 |
| Folios, displayName y lookups | 5–6 |
| Normalize, hooks, previous, constraints y decoradores | 7–8, 11–12 |
| Onchange, related y compute virtual en formulario/colecciones | 8, 18 |
| Formulario libre, Fields, Header, Stack, Notebook, guard y loaders | 9, 12, 19 |
| Colecciones compartidas, widgets, filtros, grupos, URL y selección | 10, 17 |
| Acciones, parámetros, transiciones y concurrencia | 11–12 |
| Auditoría, historial y notas | 13 |
| Many2one, One2many y Many2many | 6, 14–15 |
| Grupos, CRUD, reglas por registro y capacidades | 16 |
| Dependencias, extensiones y presentación de campos extendidos | 18 |
| Gestor de módulos y recuperación | 19 |

Quedan como oportunidades futuras, sin bloquear el recorrido: Date sin hora,
compute persistido `store: true`, permisos por campo/Access Manager ampliado,
extensiones de Partner/User, Many2many a esos modelos manuales, adjuntos generales,
notificaciones/outbox después del commit, exportación Excel, distribución ZIP y
multiempresa. Una imagen no equivale a un sistema de adjuntos. Un hook no equivale
a afterCommit. No inventar APIs para completar esa lista.

## Punto de continuación para el siguiente agente

**Avance guardado a petición del usuario (2026-11-17).** Rama `codex/tickets`.
Ejercicios 0–3 completados; ejercicio 4 en curso. Tickets está registrado e instalado,
con formulario/lista por convención. No hay vistas expulsadas ni negocio propio.

Campos completados: name/folio (prefijo elegido TCK/{year}/), asunto, descripcion,
prioridad, estado, estimacionMinutos, presupuestoMinutos, requiereVisita y active.
El usuario confirmó las pruebas propuestas de persistencia, defaults y límites;
el agente verificó fuentes/esquema/migraciones, sin repetir esas pruebas en navegador.
Última migración revisada: 20261118052359_sync_tickets, sólo requiere_visita BOOLEAN
NOT NULL DEFAULT false. Última confirmación: marcar visita, guardar y reabrir.

La retirada local de Flota y la infraestructura de folios se aplicaron con
aprobación del usuario. Las menciones iniciales a esas migraciones pendientes son
el procedimiento de arranque; no describen una tarea aún pendiente en esta Mac.
Revisar siempre el estado de la máquina al retomar. No asumir procesos dev activos.

**Siguiente ejercicio: compromisoAt**, DateTime opcional para fecha/hora de compromiso.
Explicar primero que representa un instante UTC y no Date sin hora. El usuario
escribe el campo, ejecuta orm:sync -- tickets --plan y comparte la salida antes de
aplicar. No avanzar automáticamente a otros campos ni modificar sus archivos.

Detalle de migraciones y evidencia en [estado-proyecto.md](estado-proyecto.md).
Progreso documentado localmente, sin commit/push. Retomar sólo cuando el usuario
lo indique y actualizar este resumen al cerrar el siguiente ejercicio.
