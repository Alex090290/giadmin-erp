# Compute persistido con store: true

Pendiente solicitado por el usuario el 2026-11-15. Retomar cuando la tutoría llegue
a un ejemplo real que lo necesite; esta nota no autoriza implementarlo ahora.

Dirección propuesta: permitir un Field con compute y store: true, reutilizando
@depends y su método de modelo, pero almacenando el resultado en una columna.
La sintaxis exacta y los límites se acordarán con el caso; store no existe hoy.
Hasta entonces, un campo persistente normal se puede recalcular con normalize
si es una fórmula pura sobre valores de entrada, o beforeSave si necesita contexto.
El readOnly de UI no autoriza ni protege la escritura por sí mismo.

## Criterios para el diseño

- Recalcular en servidor dentro de la transacción del guardado y sus acciones,
  aunque el cliente envíe un resultado distinto o no haya ejecutado el preview.
  Definir el orden respecto a normalize, beforeSave, constraints y tracking.
- Separar el resultado de los campos editables y contratos de entrada; definir
  creación, defaults, nulabilidad, errores, dependencia incompleta y publicación.
- Diseñar columna, migración y cálculo inicial de registros existentes; no llenar
  con un default ficticio ni ejecutar backfills destructivos automáticamente.
- Definir invalidación y recomputación al cambiar dependencias, actualizaciones
  por lote o relaciones; comenzar con alcance local explícito si el caso lo permite.
  No prometer que las escrituras Prisma directas dispararán el motor.
- Mantener permisos, reglas, revisión/concurrencia y privacidad de dependencias.
  Búsqueda/orden/filtros sólo si se publican expresamente y son coherentes con SQL.
- Probar guardado/acciones, peticiones manipuladas, concurrencia y evolución en
  fixtures aislados; conservar compute virtual sin cambios para quienes no opten.

Referencias: [Compute actual](../campos-calculados.md),
[Ciclo de modelos](../ciclo-modelos.md).
