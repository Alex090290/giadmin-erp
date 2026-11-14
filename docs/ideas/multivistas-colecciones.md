# Multivistas de colecciones: Lista, Kanban y Tarjetas

Pendiente solicitado el 2026-11-14. Propuesta por diseñar; esta anotación no
autoriza implementación ni cambios anticipados en Flota.

## Objetivo

Permitir varias vistas de una misma colección y alternar entre Lista, Kanban y
Tarjetas mediante un selector, sin sustituir una vista para activar otra.

Hoy ModuleViews sólo publica list/form y ModelCollection ofrece list/card.
VehicleKanban se carga mediante views.list. KanbanView y CardView ya existen;
el pendiente es su registro y coordinación como alternativas de una colección.

## API orientativa, no implementada

```ts
vehicle: {
  model: Vehicle,
  views: {
    list: () => import("./views/VehicleList"),
    kanban: () => import("./views/VehicleKanban"),
    card: () => import("./views/VehicleCard"),
    form: () => import("./views/VehicleForm"),
  },
},
```

La sintaxis final, las vistas por convención, el valor predeterminado y el modo
de selección/persistencia se decidirán al diseñarlo.

## Alcance y criterios de aceptación

- Selector con sólo las vistas disponibles; conservar la ruta e identidad del
  modelo y un destino de formulario compartido. Definir selección en URL y
  comportamiento de enlaces directos, atrás/adelante y retorno desde formularios.
- Conservar búsqueda, filtros y orden compatibles al alternar; definir cómo se
  tratan paginación, agrupaciones, selección de registros y parámetros específicos
  de cada vista sin aplicar silenciosamente capacidades no autorizadas.
- Mantener política de consulta, permisos, reglas y publicación de campos en
  servidor. Cambiar de vista no concede acceso ni carga todos los registros para
  filtrarlos en cliente. Kanban conserva su paginación por columna, revisión y
  transiciones mediante @action.
- Cada vista conserva TSX y personalizaciones, incluidos renderCell/renderCard.
  Diseñar carga diferida y compatibilidad de manifests list/form existentes;
  no regenerar ni sobrescribir VehicleList/VehicleKanban ni otras vistas expulsadas.
- Coordinar [eject:view Kanban](eject-kanban.md): registrar la vista bajo su tipo
  sin reemplazar list y evaluar card en el mismo contrato de multivistas.
- Probar selector, URL/navegación, estado compatible, vistas ausentes, permisos,
  errores y personalizaciones con fixtures/demos propios. Actualizar guías y
  continuidad; no presupone SQL ni una aplicación nueva.

Motivo: evitar reemplazos manuales de imports y coordinación repetida para
presentar los mismos registros de varias maneras. Siguiente paso: diseñar el
contrato de registro/selección y un ejemplo antes/después, conservando el flujo
actual durante la transición.

Referencias: [Módulos declarativos](../modulos-declarativos.md) y
[Colecciones](../vistas-colecciones.md).
