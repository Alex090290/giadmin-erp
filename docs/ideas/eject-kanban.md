# Planificar eject:view para Kanban

Solicitado y posteriormente autorizado e implementado el 2026-11-14 junto al núcleo
de colecciones. [Contrato vigente y comandos](../colecciones-modelos.md#expulsar-una-presentación).
El diseño original se conserva abajo como referencia; card también está disponible.

## Objetivo

Extender el comando existente para expulsar una vista Kanban editable:

```bash
npm run eject:view -- <modulo> <modelo> kanban
```

Usar `kanban` como nombre del tipo (la solicitud escribió «kaban»). El ejercicio
actual de Flota exigió crear VehicleKanban.tsx manualmente y repetir proyección,
opciones del Selection, capacidades y acciones. Reducir esos pasos conservando
TSX personalizable y autorización de servidor.

## Diseño y aceptación pendientes

- Revisar el parser y generador actuales de eject:view y mantener list/form
  compatibles. Exigir un modelo registrado y configuración Kanban válida.
- Generar una vista editable con el Selection y sus opciones, columnas publicadas,
  capacidades autorizadas, carga modelKanban y navegación al formulario. Reutilizar
  helpers compartidos donde reduzcan repetición sin ocultar permisos ni errores.
- Conectar transitions/modelMove según el contrato acordado, sin habilitar por
  accidente escritura directa que omita métodos @action. Definir explícitamente
  el modo consulta y el comportamiento de modelos con configuración legacy.
- Decidir cómo registrar/seleccionar la vista sin sustituir silenciosamente la
  lista expulsada: hoy views.list selecciona la colección. Preservar VehicleList,
  VehicleKanban y otras personalizaciones existentes; no regenerarlas para probar.
  Coordinar con [multivistas Lista/Kanban/Tarjetas](multivistas-colecciones.md),
  pendiente solicitado para mantener las alternativas activas con un selector.
- Mantener dry-run, preflight, rechazo de colisiones/symlinks, edición acotada del
  manifest y restauración ante fallos ordinarios; no prometer atomicidad frente a
  interrupciones. No generar SQL ni exigir migraciones para expulsar una vista.
- Probar generación, compilación, registro y preservación de vistas con fixtures
  desechables; documentar uso, límites y ejemplo antes/después.

La salida vigente usa ModelCollection, view="kanban" y columnas; el núcleo conecta
Selection, capacidades, carga y movimientos autorizados. Registra views.kanban sin
reemplazar list; true permite una vista sin archivo y eject lo reemplaza por loader.
No se han regenerado las vistas personalizadas para probar este flujo.

Referencias: [Módulos declarativos](../modulos-declarativos.md),
[Colecciones](../vistas-colecciones.md) y [tutoría de Flota](../tutorial-flota.md).
