# Planificar eject:view para Kanban

Pendiente solicitado el 2026-11-14. Sólo planificación registrada; sin
implementación autorizada por esta nota.

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

Siguiente paso al retomarlo: diseñar la salida TSX y el registro de vistas,
comparando el código manual actual con la generación propuesta antes de implementar.

Referencias: [Módulos declarativos](../modulos-declarativos.md),
[Colecciones](../vistas-colecciones.md) y [tutoría de Flota](../tutorial-flota.md).
