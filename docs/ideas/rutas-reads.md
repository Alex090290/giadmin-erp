# Rutas relacionales en reacciones, acciones y hooks

**Sugerencia, no pendiente activo** (decisión del usuario, 2026-11-17). Surgió en el
ejercicio del intervalo recomendado de Flota. El flujo vigente se conserva: consultas
explícitas con `tx` y `select`, idiomáticas en JS/Prisma. No implementar ni proponer
como siguiente paso.

## Cuándo reconsiderarla

Sólo si la escala del framework lo justifica con evidencia, por ejemplo:

- la misma consulta de un registro relacionado se repite en varios métodos o
  módulos reales (onchange, acciones, beforeSave, constraints);
- aparecen errores recurrentes por consultas manuales (permisos del destino
  omitidos, selects excesivos, N+1 en lotes);
- una versión nueva del framework revisa su ergonomía.

Al detectarlo, presentar la evidencia al usuario y decidir con él antes de diseñar.

## Problema

Para leer un dato del registro relacionado, cada método escribe su propia
consulta. Por ejemplo, `proponerIntervalo` en Vehicle hace
`tx.flotaModelo.findUnique({ where: { id: modeloId }, select: {...} })`.
`beforeSave` y las acciones repiten el mismo patrón.

## Propuesta

Declarar las rutas necesarias y recibirlas ya resueltas, como ya hacen
`@displayName` y los Fields `related`:

```ts
@onchange({ fields: ["modeloId"], reads: ["modeloId.intervaloServicioKm"], writes: ["intervaloServicioKm"] })
proponerIntervalo(values: ReactionRecord<Vehicle, "modeloId.intervaloServicioKm">) {
  return values.modelo ? { intervaloServicioKm: values.modelo.intervaloServicioKm } : {};
}
```

- Carga anticipada y declarada; no acceso perezoso tipo Odoo
  (`record.modeloId.x` con consulta oculta), para evitar N+1 y efectos ocultos.
- Reutilizar la proyección por lotes de `related`/`displayName` dentro de la
  transacción autorizada; en colecciones, por página.

## Criterios de aceptación

- Rutas Many2one de hasta tres saltos, mismo perfil, sólo campos publicados y no
  sensibles; errores de declaración al definir el modelo.
- Autorizar la lectura del registro destino con sus reglas de registro antes de
  entregarlo (resolver a la vez el pendiente de etiquetas Many2one no filtradas por
  las reglas del modelo destino). Sin acceso, la relación llega como null.
- Tipos inferidos (`ReactionRecord`, y después `ActionRecord`/hooks) con
  nulabilidad correcta; borrador parcial sin relación elegida admitido.
- Sin consultas por fila añadidas por el framework; pruebas de permisos, borrador
  parcial y lotes. Documentación y demo ficticia en /sample.
- Al terminar, simplificar `proponerIntervalo` como ejercicio guiado con el
  usuario (antes/después), sin adelantar el cambio en sus archivos.
