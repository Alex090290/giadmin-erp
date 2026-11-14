# Flota: tutoría con módulos declarativos

Recorrido actualizado el 2026-11-14 para `src/modules`. El usuario ejecuta los
ejercicios; explicar y verificar uno cada vez, sin crear modelos, vistas ni reglas
por adelantado. [Contrato y herramientas](modulos-declarativos.md).

La Flota anterior fue retirada. Al iniciar esta tutoría en `codex/flota` se
comprobó que no existen sus rutas ni su carpeta de módulo, el índice está vacío y
los registros locales de instalación/retirada no reservaban su ID. El nuevo módulo
ya usa **flota**; las migraciones históricas se conservan.

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
Siguiente paso del usuario: probar ambos movimientos, reapertura e historial de
acción, incluyendo el rechazo con una cuenta sin escritura o grupo autorizado.
ModelCollection actualmente sólo presenta list/card; la vista Kanban requiere
KanbanView con modelKanban autorizado. Valorar integración compartida si repetir
esa coordinación en la vista resulta excesivo; aún sin ampliación implementada.

Próximo bloque, un ejercicio por vez:

1. Comprobar el arrastre/selector real de Flota en ambos sentidos, historial y
   reapertura, con cuenta autorizada y rechazo sin escritura. El framework ya se
   probó con BD temporal y demos ficticias; no equivale a esta prueba de Flota.
2. Corregir la agrupación visual de los dos botones cuando el usuario retome su
   formulario; finalizarMantenimiento sigue fuera del div de botones.
3. Acordar el siguiente diseño: [multivistas Lista/Kanban/Tarjetas](ideas/multivistas-colecciones.md)
   coordinadas con [eject:view kanban](ideas/eject-kanban.md). Sólo pendientes,
   sin permiso implícito para implementarlos o reemplazar vistas.

También quedaron anotados [menús por permisos efectivos](ideas/menus-permisos-efectivos.md)
y [permisos por campo](ideas/permisos-campos.md). La propuesta render/children se
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
