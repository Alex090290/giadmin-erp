# Multivistas de colecciones: Lista, Kanban y Tarjetas

Solicitado y posteriormente autorizado e implementado el 2026-11-14 como núcleo de
colecciones compartido. Contrato vigente en [Colecciones de modelos](../colecciones-modelos.md).
Las secciones siguientes conservan el diseño original; ya no son el siguiente paso.

## Objetivo

Permitir varias vistas de una misma colección y alternar entre Lista, Kanban y
Tarjetas mediante un selector, sin sustituir una vista para activar otra.

Antes ModuleViews sólo publicaba list/form y ModelCollection ofrecía list/card;
VehicleKanban sustituía views.list. Ahora list/card/kanban tienen registro independiente,
selector y una fuente compartida. Flota registra las tres sin borrar VehicleList.

## API del registro (implementada)

```ts
vehicle: {
  model: Vehicle,
  view: "kanban",
  views: {
    list: () => import("./views/VehicleList"),
    kanban: () => import("./views/VehicleKanban"),
    card: () => import("./views/VehicleCard"),
    form: () => import("./views/VehicleForm"),
  },
},
```

Las entradas también admiten true para usar la presentación por convención. La
configuración Kanban del modelo se mantiene; selección en URL con ?view=tipo.

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

Motivo: evitar reemplazos manuales y coordinación repetida para presentar los mismos
registros. Implementación: ModelCollection + modelCollection(config), queryColumns
compartidas y extensión Kanban por columna, con los proveedores autorizados existentes.
Demo /sample#collection-core. Evidencia y límites actuales en el estado del proyecto.

Referencias: [Módulos declarativos](../modulos-declarativos.md) y
[Colecciones](../vistas-colecciones.md).
