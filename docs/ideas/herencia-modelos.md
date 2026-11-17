# Herencia y extensión de modelos entre módulos

**Fases 1 y 2 implementadas el 2026-11-17** a petición del usuario (rama `codex/herencia`).
Uso y límites vigentes en [Módulos declarativos §7](../modulos-declarativos.md#7-extender-un-modelo-de-otro-módulo-herencia).
La fase 3 (Partner/User) sigue pendiente. El usuario autorizó la fase 2 antes de
Tickets para poder utilizarla y ajustarla sobre la marcha. Las propuestas originales
de abajo son históricas; prevalece el contrato vigente de la guía enlazada.

**Hallazgo de la implementación:** con `experimentalDecorators` (transform legacy de
Next/tsx) los decoradores no se aceptan en clases anónimas. Las extensiones declaran
la clase con nombre dentro del mixin y la devuelven:
`extendModel(Base0, Base => { class X extends Base { ... } return X; })`.
TypeScript también rechaza redeclarar un campo del base con un tipo incompatible.

## Problema original (histórico)

Hoy un módulo sólo puede modificar sus propios modelos. No existe el equivalente al
`_inherit` de Odoo: que un módulo B añada campos, reglas o vistas a un modelo de un
módulo A sin editar las fuentes de A. Tampoco se pueden extender los nativos
(Partner, User), porque son modelos manuales.

## Propuesta original (histórica)

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

1. **Implementada (2026-11-17).** Extensión de modelos declarativos: `extendModel`,
   composición en el registro, tabla compañera con lectura/guardado transaccional,
   grupo por defecto y `<ModelExtensions />`.
2. **Implementada (2026-11-17)**: campos extendidos en colecciones, vista propia de la
   extensión, reglas sobre el base, related, Image y unique opcional sin default.
3. **Pendiente:** nativos (Partner primero, luego User).

## Fase 2: alcance implementado (2026-11-17)

Decisión posterior del usuario: implementarla ahora, sin esperar a Tickets. Se
conserva la tabla compañera y se reutilizan los motores de consultas y permisos.
Registros sin compañera se consultan como vacío y el formulario ofrece defaults;
no se rellenan filas ni se modifican datos reales al instalar esta mejora del framework.

1. **Colecciones.** Columnas de campos extendidos en lista, tarjetas y kanban; búsqueda,
   filtros, orden y agrupación. El servicio traduce las condiciones a la relación 1:1
   (`{ <relación>: { is: {...} } }`), igual que las rutas Many2one, y el repositorio
   proyecta la compañera en `list` y agrupa mediante su delegate con alcance por
   `record.is`, paginación SQL y un grupo vacío final. Los campos ya participan
   de la política derivada; el override explícito del base prevalece.
2. **Vista propia de la extensión.** `views: { form: () => import(...) }` en la
   declaración de la extensión, montada por `<ModelExtensions />` dentro del mismo RHF,
   sin editar la vista del base; carga diferida como las demás vistas.
3. **Reglas y campos avanzados.** Reglas de registro (del base o del extensor) sobre
   campos extendidos, p. ej. «el técnico ve los equipos de los que es responsable»;
   admitir `related`, Image (uploads firmados) y `unique` opcional sin default.

Criterios de aceptación: cada pieza con pruebas unitarias y en
`test:extensions:integration` (proyecto/esquema temporales), sin regresión en
`test:modules:integration`/`test:one2many:integration`; los permisos y la autorización
siguen en el servidor; documentación en
[Módulos declarativos §7](../modulos-declarativos.md#7-extender-un-modelo-de-otro-módulo-herencia).

## Criterios de aceptación (fase 1)

- Fixture propio (`scripts/fixtures/modules-ensayo` u otro) con un módulo base y otro
  que lo extiende; proyecto y esquema temporales, nunca datos reales.
- Pruebas: colisión de nombres, dependencia ausente, orden con dos extensiones,
  `super` en hooks/constraints, lectura y guardado atómicos con una revisión,
  concurrencia, permisos/reglas heredados de la base, fila compañera ausente,
  desinstalar la extensión (keep/drop) y bloqueo al desinstalar la base.
- El módulo base no se modifica para que la extensión aparezca.
- Guía en `docs/` y demo ficticia si aporta.

## Plan original de implementación de la fase 1 (histórico, 2026-11-17)

Resultado de revisar el código (`src/lib/modules/define.ts`, `registry.ts`,
`repository.ts`, `src/lib/orm/generator/generate.ts`, `install.ts`, `prepare.ts`,
`model.ts`, `decorators.ts`, `module-manager/inventory.ts`, `ModelForm.tsx`).

### Hallazgos que simplifican

- La tabla compañera **es un modelo generado normal** del módulo extensor con un
  Many2one **único y obligatorio** al modelo base: el generador ya crea la inversa
  1:1 (`X?`) en el esquema del base y el instalador ya registra esa inversa como
  propiedad del extensor (la quita al desinstalarlo). El esquema del base no cambia.
- `depends` ya bloquea desinstalar el base mientras el extensor exista
  (`inventory.ts` dependents) y el generador exige declarar la dependencia del
  propietario del destino.
- Los decoradores recorren la cadena de prototipos: `@action`, `@onchange`,
  `@constraint` y `@depends` de la subclase se registran solos.
- Las escrituras anidadas de Prisma (`create`/`upsert` dentro de `update`) dan
  atomicidad y una sola revisión (`updatedAt` del base) sin otra transacción.

### Cambios

1. **API** (`src/lib/modules/extend.ts`): `extendModel(Base, Base => class extends Base {...})`
   con import directo de la clase base (tipos inferidos). Manifest:
   `depends: ["base"]`, `extends: { "base.modelo": Extension }`; `models` puede quedar vacío.
2. **defineModule** del extensor: compone para validar (colisiones de campos/métodos
   con el base, reservados, `depends` presente) y genera el modelo compañero
   `<Extensor><Base><Clave>` / tabla `<extensor>_<base>_<clave>` con los campos nuevos
   + `recordId` Many2one único al base. El compañero no tiene rutas, menús, accesos ni
   servicio. Fase 1: campos persistentes opcionales o con default literal (como la
   evolución aditiva); sin One2many, related ni Image en extensiones; compute permitido
   si depende de campos locales.
3. **Generador**: `onDelete: "Cascade"` sólo interno para el enlace compañero (no se
   expone en `Fields.Many2one`), para que borrar el registro base borre su fila.
4. **Registro**: extraer de `defineModule` la compilación de un `ModuleModel` y
   reutilizarla para recomponer los modelos extendidos en orden de dependencias
   (`extB(extA(Base))`, desempate por ID), con `defineModel` sobre la clase final.
   Accesos, reglas y capabilities siguen siendo los del modelo base.
5. **Repositorio**: el base incluye la relación compañera en `select`; el DTO aplana
   los campos (fila ausente → defaults, sin backfill); `create` anida `create` y
   `update` anida `upsert`, en la misma escritura y revisión.
6. **Cliente y vistas**: `config.extensions` (módulo, etiqueta, campos);
   `ModelFields` pinta un `FormGroup` por extensión; componente `<ModelExtensions />`
   para formularios expulsados; plantilla de `eject:view` lo incluye. Si una vista
   expulsada no lo incluye, RHF conserva los valores igualmente.
7. **Gestor de módulos**: el inventario reconoce los modelos compañeros como propiedad
   del extensor (alcance de «Eliminar datos»); un módulo sólo de extensiones no muestra
   app en el cajón.
8. **Fuera de fase 1**: columnas/filtros/orden/agrupación por campos extendidos
   (`list: false` forzado), reglas de registro sobre ellos, vista propia de la
   extensión, nativos (Partner/User).

### Pruebas

- Unitarias (`modules.test.ts`, `generator.test.ts`): composición y orden con dos
  extensiones, colisiones, dependencia ausente, required sin default rechazado,
  esquema del compañero (unique, Cascade, inversa), `super.beforeSave`, decoradores.
- Integración en proyecto/esquema temporales: fixture nuevo `modules-ensayoext` que
  extiende `ensayo.tarea`; instalar ambos, leer/guardar/crear con campos extendidos,
  fila ausente con defaults, conflicto de revisión, permisos/reglas del base, borrar
  base en cascada, desinstalar base bloqueado, desinstalar extensor keep/drop.
- `tsc`, lint, `test:orm`, `test:modules`, integraciones existentes y build.

### Riesgos

- Un `beforeSave` del base que construya un objeto nuevo sin los campos extendidos los
  perdería: Zod estricto lo rechaza con error claro; documentar `{ ...values }`.
- El inventario AST del gestor debe aprender `extends`; verificar el alcance exacto de
  «Eliminar datos» antes de cerrar.
- Tipos del mixin con decoradores legacy (`experimentalDecorators`): validar con tsc en
  el fixture antes de seguir.

## Límites

- Partner/User (fase 3) siguen pendientes; no se implementan como parte de la fase 2.
- Flota está retirada; el ejemplo `flota.vehicle` es ilustrativo.

Relacionado: [Módulos declarativos](../modulos-declarativos.md),
[gestor de módulos](../gestor-modulos.md),
[distribuir módulos](modulos-distribuibles.md) (dependencias entre módulos).
