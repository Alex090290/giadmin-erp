# Flota: tutoría con módulos declarativos

Recorrido actualizado el 2026-11-14 para `src/modules`. El usuario ejecuta los
ejercicios; explicar y verificar uno cada vez, sin crear modelos, vistas ni reglas
por adelantado. [Contrato y herramientas](modulos-declarativos.md).

La Flota anterior fue retirada. Al iniciar esta tutoría en `codex/flota` se
comprobó que no existen sus rutas ni su carpeta de módulo, el índice está vacío y
los registros locales de instalación/retirada no reservaban su ID. El nuevo módulo
ya usa **flota**; las migraciones históricas se conservan.

## Punto vigente (2026-11-15)

El usuario confirmó las comprobaciones con Consulta, Operador y Responsable:
consulta bloqueada; creación/edición y mantenimiento de vehículos propios con
Operador; acceso a vehículos ajenos con Responsable y catálogos en consulta.
Son confirmaciones del usuario, sin pruebas autenticadas independientes del agente.

Siguiente ejercicio propuesto: una restricción con @constraint sobre active/estado
para impedir desactivar vehículos en mantenimiento. Usa los campos existentes,
ModelValidationError (alias Err) y validación definitiva del servidor; debe operar
en guardado, acciones y Kanban. El usuario añadió constraint al import y validarDesactivacion con dependencias
active/estado y Err asociado a active; fuentes verificadas por el agente.
El usuario confirmó rechazo en mantenimiento conservando borrador, Revertir,
finalizar mantenimiento y desactivación posterior permitida. Es lógica de servidor
sin cambios de campos/esquema; no requiere orm:sync por esta modificación. No modificar sus archivos de Flota por adelantado.

Siguiente ejercicio: añadir kilometraje Integer obligatorio, default 0, min 0
y tracking. Después sincronizar, colocar FieldNumber en formulario y practicar
context.previous en beforeSave para impedir reducir el kilometraje. El usuario añadió kilometraje y se verificó Integer con required/default 0/min 0/
tracking en vehicle.ts. El usuario compartió SQL de 20261115232209_sync_flota: sólo añade kilometraje
INTEGER NOT NULL DEFAULT 0 a flota_vehicle; revisado y luego dio por completado
orm:sync. Archivo SQL y campo Prisma verificados; sin consulta independiente a BD.
FieldNumber importado y colocado por el usuario dentro de Stack con
name="kilometraje" type="integer"; verificado en fuentes. El usuario confirmó guardar/reabrir 15000, rechazo de -1 y Revertir.
Siguiente: al inicio del beforeSave existente comparar values.kilometraje con
context.previous?.kilometraje y lanzar Err asociado a kilometraje si disminuye.
El usuario añadió la comparación en el beforeSave existente, antes de consultar
Modelo; verificados guardas number, Err con kilometraje y conservación del return
que construye name. Pendiente prueba: bajar 15000 a 14999 debe rechazarse sin
perder borrador; guardar 15000/16000 debe permitirse y reabrir conserva el valor.
No requiere orm:sync por este cambio de lógica; no se ejecutaron SQL ni pruebas
sobre registros reales desde el agente. No adelantar archivos ni SQL.

Próximo ejercicio propuesto: campo calculado virtual de kilómetros restantes
para próximo servicio, con @depends. Primer paso: usuario declara proximoServicioKm
Integer obligatorio, default 20000, min 0 y tracking. Después revisar/sincronizar
y añadir cálculo/resta y presentación display. proximoServicioKm ya fue añadido, se corrigió default a 20000 y se verificó en
fuentes. Usuario compartió SQL 20261116001156_sync_flota (sólo añade
proximo_servicio_km INTEGER NOT NULL DEFAULT 20000), aprobado tras revisión y
confirmó finalización de orm:sync. Archivo SQL verificado, sin consulta a BD.
Siguiente paso guiado: importar depends/ReactionValues, declarar kilometrosRestantes
Integer compute calcularKilometrosRestantes y método @depends sobre
proximoServicioKm/kilometraje; resta si ambos son números o null en borrador
incompleto. Sin default/tracking/min 0 en el virtual: negativos indican atraso.
El usuario añadió kilometrosRestantes con compute y el método @depends
calcularKilometrosRestantes; verificados nombres, dependencias y resta/null.
El usuario ya añadió en Stack de VehicleForm FieldNumber<Values> editable para
proximoServicioKm y FieldNumber mode=display sin <Values> para kilometrosRestantes;
ambos verificados en fuentes, prueba funcional pendiente de confirmación.
El módulo proyecta preview/reactionRules desde la clase en runtime; no requiere
SQL por el virtual. Presentación y prueba funcional pendientes; no usar compute persistido ni prometer filtro/orden de ese virtual en colecciones.
La prueba de disminución anterior fue recibida con conformidad del usuario
(«eso demuestra que ya estamos bien preparados para hacer lógica en la clase»);
no se repitió de forma independiente ni se confirmó cada valor por separado.

Ampliación posterior autorizada: compute ya se publica en Lista/Card/Kanban por
página autorizada. Reutiliza método del modelo y dependencias publicadas, sin
filtros/orden/grupos virtuales; [contrato](campos-calculados.md#lista-card-y-kanban-2026-11-15).
El usuario añadió {field:"kilometrosRestantes"} a VehicleList; verificado en
fuentes. El agente no editó sus columnas. El usuario confirmó reacción en formulario y coincidencia del resultado guardado
en lista (ejercicio positivo/cero/negativo). No se repitió con registros reales
desde el agente. El usuario modificó finalizarMantenimiento: return con estado disponible y
proximoServicioKm = record.kilometraje + 10000; fuente verificada, validación y
grupos conservados. El usuario confirmó que funcionó el ejercicio: enviar a mantenimiento, aumentar
kilometraje sin guardado manual, pulsar Finalizar, programar objetivo con valor
actualizado, mostrar 10000 restantes y comprobar reapertura/historial. Confirmación
del usuario, sin prueba independiente del agente sobre BD real. Intervalo fijo de práctica, sin nuevo Field ni SQL. En este módulo no exige orm:sync por el soporte, sin SQL nuevo.
Exportar a Excel se anotó como futuro, no implementado en este bloque.

## Inicio de cabecera y líneas (2026-11-15)

Usuario aceptó continuar con Mantenimiento relacionado con Vehicle. Primer paso:
ejecutar npm run create:model -- flota Mantenimiento; aún no existe el modelo en
fuentes al revisar. El usuario lo genera y personaliza paso a paso; no adelantar
archivos ni SQL. Modelo hijo previsto: relación obligatoria a FlotaVehicle, fecha,
kilometraje y trabajo realizado; definir campos concretos en los siguientes pasos.

Distinción vigente: Fields.Many2one y las inversas Prisma están disponibles;
FieldOne2many ya permite tabla editable inline con RHF/Zod. Todavía no existe
Fields.One2many declarativo ni guardado anidado automático de líneas en ModelForm/
createModelService. Para conectar líneas de Flota como parte del guardado padre
habrá que diseñar/ampliar ese contrato, reutilizando la UI y garantías existentes,
sin presentar el soporte como ya terminado ni cambiarlo por edición modal.

## Recorrido previsto

1. Crear el módulo mínimo y entender manifest e índice explícito.
2. Añadir Fabricante, personalizar campos, revisar la instalación y probar las vistas
   por defecto con guardado/reapertura; después añadir su logo con Fields.Image y
   revisar Actualizar conservando el registro existente.
3. Añadir Modelo y su Many2one a Fabricante, con lookup por convención.
4. Añadir Vehicle y su relación a Modelo; construir name como
   «[MATRÍCULA] Modelo / Fabricante» al guardar (decisión tomada con el usuario).
5. Practicar las opciones de colección en Fields.
6. Expulsar formulario y lista de Vehicle con `eject:view` y personalizar su TSX.
7. Declarar grupos, permisos y reglas; asignarlos desde Control de accesos.
8. Añadir una imagen `related` del logo del fabricante.

No es necesario escribir un manifest desde cero ni generar vistas por modelo:
`create:module` produce el esqueleto y `create:model` registra cada clase. Los
menús y las reglas de negocio/acceso sí se personalizan expresamente.

## Base al cierre del 2026-11-13

Rama `codex/flota`. Después de la primera pausa para cambiar de máquina, la tutoría
continuó con Vehicle. El usuario ejecutó los ejercicios y personalizó sus archivos;
el asistente revisó fuentes y desarrolló mejoras compartidas del framework.

- **Fabricante**: creado e instalado; name obligatorio (120), active default true,
  tracking y displayName basado en name. El usuario confirmó guardar y reabrir.
- **Logo**: Image opcional con label Logotipo, folder `flota/fabricantes` y tracking.
  Almacena URL en VARCHAR(2048) nullable. El usuario confirmó subir, guardar y reabrir
  la imagen después de actualizar y finalizar mantenimiento.
- **Modelo**: creado e instalado con name/active y `fabricanteId` Many2one obligatorio
  a `FlotaFabricante`, onDelete Restrict y tracking. Conservar el nombre elegido por
  el usuario: su alias de lectura es `fabricante`.
- **Presentación de Modelo**: `@displayName("name", "fabricante.name")`, proyección
  readonly y unión de ambos nombres con ` / `. El usuario confirmó el ejercicio de
  crear/reabrir un modelo seleccionando fabricante y la presentación «Corolla / Toyota».
- **Vehicle**: creado con create:model y registrado en el manifest; presente en
  `prisma/models/orm-flota.prisma`. Matrícula obligatoria y única (20), relación
  `modeloId` obligatoria a FlotaModelo con Restrict, active y tracking.
- **Nombre del vehículo**: name opcional en la captura, máximo 300; normalize
  recorta/convierte matrícula a mayúsculas. beforeSave consulta Modelo y Fabricante
  con context.tx y devuelve `[MATRÍCULA] Modelo / Fabricante`; displayName devuelve
  name o «Nuevo vehículo». No hay recálculo automático de vehículos al renombrar
  un fabricante por separado.
- **Pruebas confirmadas por el usuario**: crear/guardar/reabrir, editar matrícula,
  rechazar matrícula duplicada aun escrita en minúsculas conservando el borrador,
  y cambiar modelo actualizando el nombre al guardar.
- **Imagen relacionada**: fabricanteLogo usa `modeloId.fabricanteId.logo`; no
  almacena otra imagen ni columna. El usuario confirmó el logo y su actualización
  al seleccionar otro modelo, sin guardar.
- **Vistas personalizadas**: se ejecutó eject:view para form y list. VehicleForm
  muestra avatar cuadrado y nombre con widget header fuera de FormGroup; Stack
  organiza matrícula/modelo y active permanece debajo. Conservar esta maquetación.
  VehicleList declara logo, name, plate, modeloId y active. Se corrigió el fallo de
  publicación de related en ModelCollection/política del servidor; falta confirmación
  visual final de esa lista después de la corrección.
- Manifest con icon `car`, modelos fabricante/modelo/vehicle e índice explícito.
  Fabricante y Modelo siguen usando vistas por convención, lookup y uploader.

Mejoras compartidas surgidas de la tutoría:

- FieldText widget header: h1 de sólo lectura sin label y con valor RHF.
- Stack: dos columnas según ancho del contenedor y Fields block; admite colocarse
  dentro de FormGroup. Demos y contratos en ui/form y /sample.
- Related en colecciones: política y presentación compartidas incluyen campos
  relacionados de lectura, sin ampliar búsqueda/orden/filtros/grupos SQL.
- Invisible: booleano en modelos y props de todos los Fields; herencia y override
  false, ocultación sin perder valores/RHF/validación. Demo `/sample#field-invisible`.
  No se añadió invisible por adelantado a las clases de Flota.

Verificación: revisadas fuentes de Flota y esquema/migración de Vehicle, sin leer
ni modificar datos reales desde el asistente. Las comprobaciones funcionales de
Flota anteriores son confirmaciones del usuario. Para las mejoras compartidas
pasaron test:form-model (8), test:modules (21), test:orm (75), TypeScript y ESLint
de archivos modificados. Invisible se comprobó en navegador con datos ficticios:
envío oculto, edición/ocultación conservando valores, override y validación de un
obligatorio oculto. No se ejecutó build ni SQL para esas mejoras. Este cierre sólo
actualiza documentación y verifica su diff; no vuelve a ejecutar esas suites.

Migraciones creadas durante el recorrido (conservar junto con esquemas y propiedad):

- `20261113224609_sync_flota`: Fabricante.
- `20261113225348_sync_flota`: logo.
- `20261113231720_sync_flota`: Modelo y relación con Fabricante.
- `20261114031721_sync_flota`: Vehicle y su relación con Modelo (nombre UTC del archivo).

## Pendiente para retomar

### Continuación vigente (2026-11-14)

Las acciones del modelo y FormHeader/FormButton están implementados, con base
versionada en fdd4d5b. Las ampliaciones del día siguen sin commit en codex/flota;
no se hicieron commit/push/pull. Vehicle conserva testing como práctica, pero el
usuario retiró su botón y volvió a mostrar active. FormContent observa estado con
useWatch y presenta botones de mantenimiento condicionales. El usuario confirmó
el título de pestaña del registro. [Cierre y verificaciones del día](estado-proyecto.md#cierre-del-2026-11-14).

Verificado searchable:true en name/plate. El usuario dio por completados el
ejercicio de búsqueda y el de filtro Activo y agrupación Modelo → Activo;
son confirmaciones del usuario, sin repetición independiente en navegador.
Menú completado por el usuario y verificado en manifest: Vehículos → vehicle y
Configuración → Fabricantes/Modelos (fabricante/modelo), conservando clases,
claves y vistas personalizadas. Grupos consulta (lectura de los tres modelos) y
operador (hereda consulta y añade cru en vehicle) declarados y verificados en
manifest. El usuario comprobó rechazo de guardado sin escritura. Se diagnosticó
que overrides sin lectura de Modelo impedían resolver etiquetas de la lista;
también que declarar operador no asignaba automáticamente la cuenta al grupo.
El usuario dio por completado el paso tras indicar la asignación; no se repitió
el guardado en navegador por el asistente. Regla vehiculos-propios (label «Mis
vehículos») ya declarada y verificada: grupo operador, createBy = actor.id.
El usuario dio por completado el ejercicio; sin repetición funcional independiente.
Responsable ya declarado y verificado: hereda operador y regla vehiculos-todos
con domain:[]; usuario dio por completado el ejercicio, sin prueba funcional
independiente. Conserva cru sólo sobre Vehicle, sin eliminación ni escritura
de catálogos. El usuario aceptó el ejercicio Disponible ↔ En mantenimiento.
Vehicle ya declara estado Selection obligatorio, default disponible y tracking;
verificados enum/campo en prisma/models/orm-flota.prisma y migración
20261114180636_sync_flota. El usuario dio por completado orm:sync, sin comprobación
independiente de la BD. Statebar ya colocado en FormHeader; métodos
enviarMantenimiento/finalizarMantenimiento verificados con grupo operador y
validación de estado previo. Label de envío corregido y ambos botones ya conectados
con useWatch de estado e invisible; usuario retiró el botón testing del formulario
y volvió a mostrar active. Revisión detectó finalizarMantenimiento fuera del div
que agrupa botones: indicar colocarlo dentro para evitar hueco/distribución al
ocultar enviarMantenimiento. Las pruebas de ambas transiciones desde formulario,
guardado previo e historial fueron confirmadas por el usuario, sin repetición
independiente por el asistente.
Posteriormente, por petición del usuario, se implementó widget badge compartido y
se conectó VehicleList.estado con disponible success y mantenimiento warning;
presentación sin SQL. Demo y verificación en el estado del proyecto; no confirma
las pruebas funcionales de mantenimiento. Después el usuario dio por completado
el recorrido de transiciones, guardado previo, reapertura e historial; confirmación
del usuario, sin repetición independiente por el asistente.
Tablero Kanban por estado creado y conectado por el usuario mediante views.list
a VehicleKanban, conservando VehicleList. El usuario dio por completada su apertura.
Después autorizó transiciones mediante acciones: se amplió kanban a
{field:"estado",transitions:[...]} con disponible → mantenimiento mediante
enviarMantenimiento y mantenimiento → disponible mediante finalizarMantenimiento.
VehicleKanban conecta modelMove y config.kanbanTransitions: el selector/arrastre
usan los destinos publicados y el servidor ejecuta la acción con sus grupos y
reglas. Se conservan estados, clases, métodos y diseño; no se añadió SQL ni se
modificaron registros de Flota. Pruebas y límites en el estado del proyecto.
En la continuación, el usuario confirmó ambos movimientos, reapertura e historial
y dio por completado el ejercicio de rechazo con una cuenta de Consulta. No se
repitieron desde el asistente ni se precisó si la UI bloqueaba antes de intentar
el movimiento o rechazaba al ejecutar. Se verificó la agrupación de ambos botones
en el mismo div de VehicleForm. El usuario añadió createHref a VehicleKanban y
confirmó que Nuevo abre la creación. Existen además vistas nuevas de Fabricante
y Modelo y cambios de manifest del usuario: conservarlos, sin darlos por revisados.
ModelCollection actualmente sólo presenta list/card; la vista Kanban requiere
KanbanView con modelKanban autorizado. Valorar integración compartida si repetir
esa coordinación en la vista resulta excesivo; aún sin ampliación implementada.

Petición posterior: ModeloList usa ModelCollection con view="card" y conserva sus
campos name, fabricanteId y active. La vista ya registrada en Configuración →
Modelos presenta tarjetas; no se añadió un selector multivistas ni se modificó el
modelo/BD. Falta confirmación visual del usuario.

Próximo bloque, un ejercicio por vez:

El usuario autorizó e implementamos el núcleo compartido y multivistas: ver
[Colecciones de modelos](colecciones-modelos.md). VehicleList se conserva;
VehicleKanban usa ahora ModelCollection y VehicleCard añade otra presentación.
Kanban es inicial y el selector permite Lista/Tarjetas/Kanban. Modelo conserva
Card inicial y su TSX, con Lista por convención; no se regeneraron formularios.
Los providers comunes mantienen permisos/reglas/transiciones y retorno seguro.
eject:view ya admite card/kanban sin sustituir list ni sobrescribir archivos.

1. Recargar Vehículos y comprobar las tres presentaciones; repetir búsqueda,
   filtro y orden al alternar y verificar abrir/crear/volver con la URL original.
2. Comprobar Lista/Tarjetas en Configuración → Modelos.
3. Recargar y probar capacidades con los perfiles existentes: consulta bloqueada,
   Nuevo/guardar/Eliminar/acciones y movimientos según permisos; revisar menús
   y Configuración. No cambiar asignaciones de cuentas para adelantar el ejercicio.

Verificación de esta ampliación y límites en el estado del proyecto. Las pruebas
de navegador usaron fuente ficticia /sample#collection-core, no registros reales;
la prueba completa de módulos quedó detenida por falta de pg_dump/pg_restore.

Las [capacidades y menús efectivos](capacidades-modelos.md) ya están implementados
y verificados con fixtures aislados y demo /sample#model-capabilities. No requiere
orm:sync. Siguen pendientes los [permisos por campo](ideas/permisos-campos.md). La propuesta render/children se
retiró al confirmar que renderCard ya personaliza tarjetas. Mantener reglas
definitivas en servidor; ocultar un botón no impide escribir un estado desde una
petición. No crear Ventas ni adelantar archivos de Flota.

Conservar la preferencia de maquetación libre, el logo related, los hooks existentes
y las personalizaciones. Los menús/accesos y nuevos ejercicios se hacen al ritmo
del usuario; la prioridad de framework no autoriza adelantar su aplicación.

## Continuidad en la otra máquina

En este cierre hay cambios locales sin commit, incluidos documentación, mejoras
compartidas, fuentes de Flota, esquema/propiedad e historial de migraciones. Verificar
el estado real de Git al retomar; no asumir que todo quedó compartido. Transferir mediante
commit/push autorizado y obtenerlos en la otra máquina antes de continuar. No se
hicieron commit, push ni pull como parte de registrar este cierre.

La configuración privada, dependencias, cliente Prisma generado, servidor dev y
registros de la BD no se transfieren por Git. En la otra máquina, comprobar rama y
estado, instalar dependencias según lockfile, disponer de configuración privada por
un medio apropiado y comprobar qué BD está configurada y qué migraciones tiene.
Generar Prisma Client para esa copia; revisar cualquier migración pendiente antes
de aplicarla. No asumir que usa la misma BD ni ejecutar reset/push/seed para retomar.
No guardar secretos en la documentación o el repositorio.

La instalación/actualización se revisa desde Módulos o mediante orm:sync. Reiniciar
dev tras regenerar Prisma y finalizar mantenimiento si se usó el gestor. Las pruebas
del framework usan fixtures y esquemas temporales independientes de esta tutoría.

## Continuación del 2026-11-15

La carga y recuperación de Lista/Card/Kanban ya comparte núcleo, incluidas ramas
de lista agrupada. Recargar para recibirlo; no ejecutar orm:sync por este cambio.
Las pruebas de fallo/reintento están en /sample#collection-core con datos ficticios.
Retomar el próximo bloque de ejercicios indicado arriba, uno por vez. La propuesta
de ofrecer botones automáticamente según estado permanece para otra mejora;
este bloque no modifica las acciones ni clases de Flota.
