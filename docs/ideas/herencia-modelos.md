# Herencia y extensión de modelos entre módulos

**Pendiente de diseño** registrado el 2026-11-17 a petición del usuario. Es una
propuesta aceptada en lo general, ligada a la guía de
[Tickets de servicio interno](tickets-servicio.md). No autoriza código: se detalla,
se presenta y se implementa sólo con aprobación, cuando la guía llegue al caso real.

## Problema

Hoy un módulo sólo puede modificar sus propios modelos. No existe el equivalente al
`_inherit` de Odoo: que un módulo B añada campos, reglas o vistas a un modelo de un
módulo A sin editar las fuentes de A. Tampoco se pueden extender los nativos
(Partner, User), porque son modelos manuales.

## Propuesta

### 1. Declaración: mixin de clase

```ts
// src/modules/tickets/models/vehicle.ext.ts
export const VehicleTickets = extendModel("flota.vehicle", Base => class extends Base {
  responsableId = Fields.Many2one("User", { label: "Responsable", tracking: true });
  ticketsAbiertos = Fields.Integer({ label: "Tickets abiertos", compute: "contarTickets" });

  beforeSave(values, context) {
    const result = super.beforeSave(values, context); // conserva la regla del módulo base
    // reglas propias de la extensión…
    return result;
  }
});

// manifest de tickets
depends: ["flota"],
extends: { "flota.vehicle": VehicleTickets },
```

- JS/TS puro: `super` sustituye al `super()` de Odoo; los decoradores (`@action`,
  `@onchange`, `@constraint`, `@depends`) funcionan en la subclase.
- Tipos inferidos: la extensión recibe `Base` tipado y el modelo final expone los
  campos añadidos en `FormValues<>`.

### 2. Composición en el registro

`Final = extB(extA(Base))` en orden de dependencias, y `defineModel` una sola vez.
Validar al componer: nombres de campo/método sin colisión ni reservados, que el
módulo extensor **dependa** del extendido y orden determinista entre extensiones.

### 3. Persistencia: tabla compañera (recomendada)

| Opción | Ventaja | Problema |
| --- | --- | --- |
| Columnas en la tabla base (`_inherit` de Odoo) | Consultas simples | Prisma no reparte un modelo en varios archivos; desinstalar exige quitar columnas de una tabla ajena; propiedad por columna |
| **Tabla compañera** `tickets_flota_vehicle` con FK única 1:1 | Cada módulo es dueño de su tabla; desinstalar = su tabla, como hoy; no toca el esquema base | Join en lecturas (lo hace el repositorio) |

El repositorio generado:
- **lee** base + compañera en la misma transacción;
- **guarda** ambas en la misma transacción Serializable con **una sola revisión** (la
  de la base);
- **crea** la fila compañera al guardar si no existe, con los defaults.

Encaja con la propiedad de tablas del instalador y con `sourceDependents`, que ya
bloquea desinstalar un módulo requerido por otro.

### 4. Vistas: puntos de extensión

- Convención: el formulario por defecto añade un grupo por extensión.
- Vistas expulsadas: `<ModelExtensions />` marca dónde se pintan los campos o vistas
  de las extensiones.
- Vista propia de la extensión: `views: { form: () => import("./views/…") }`, montada
  en ese hueco dentro del mismo RHF.
- Nunca editar el TSX del módulo base ni inyectar por XPath.

### 5. Accesos, colecciones e instalación

- Los campos extendidos se rigen por permisos y reglas **del modelo base**.
- Columnas extendidas opcionales en colecciones; filtro/orden por la relación 1:1.
- Instalar: base primero; la extensión crea su tabla y filas (backfill o al vuelo).
- Desinstalar la extensión: keep/drop sólo de su tabla. Desinstalar la base queda
  bloqueado mientras exista una extensión instalada.

### 6. Nativos (Partner, User)

- **A**: convertir Partner en declarativo dentro de un módulo «core» (más limpio;
  toca Contactos, Usuarios y Perfil).
- **B**: adaptador explícito de Partner que acepte tablas compañeras (más rápido,
  menos uniforme).

Se decide en la fase 3.

## Fases

1. Extensión de modelos declarativos: `extendModel`, composición en el registro,
   tabla compañera con lectura/guardado transaccional, grupo por defecto y
   `<ModelExtensions />`.
2. Columnas/filtros en colecciones, vista propia de la extensión, reglas avanzadas.
3. Nativos (Partner primero).

## Criterios de aceptación (fase 1)

- Fixture propio (`scripts/fixtures/modules-ensayo` u otro) con un módulo base y otro
  que lo extiende; proyecto y esquema temporales, nunca datos reales.
- Pruebas: colisión de nombres, dependencia ausente, orden con dos extensiones,
  `super` en hooks/constraints, lectura y guardado atómicos con una revisión,
  concurrencia, permisos/reglas heredados de la base, fila compañera ausente,
  desinstalar la extensión (keep/drop) y bloqueo al desinstalar la base.
- El módulo base no se modifica para que la extensión aparezca.
- Guía en `docs/` y demo ficticia si aporta.

## Límites

- No implementar por anticipación; el caso real lo aporta la guía de Tickets
  (ticket que amplía un modelo de otro módulo o Partner con departamento).
- Flota está retirada; el ejemplo `flota.vehicle` es ilustrativo.

Relacionado: [Módulos declarativos](../modulos-declarativos.md),
[gestor de módulos](../gestor-modulos.md),
[distribuir módulos](modulos-distribuibles.md) (dependencias entre módulos).
