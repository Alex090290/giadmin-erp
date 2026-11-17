# Estrategia para distribuir módulos entre proyectos

**Pendiente urgente** (prioridad elevada por el usuario el 2026-11-17). Solicitado
originalmente el 2026-11-15. Diseñar y presentar la propuesta al usuario antes de
implementar; esta nota no autoriza código.

## Alcance

Llevar un módulo declarativo de **un proyecto a otro distinto** (otra instancia del
ERP, otro repositorio). Dentro de un mismo proyecto no aplica: el módulo va de
desarrollo a producción por Git (commit → merge a `main` → `migrate deploy`).

No es instalación dinámica, carga desde la UI de producción ni ejecución de un ZIP
dentro del servidor en marcha. El ZIP se incorpora en el **desarrollo** del proyecto
destino; de ahí sigue el flujo normal de ese proyecto hasta producción.

## Prueba manual del concepto (2026-11-17)

Razonada con el usuario a partir del gestor actual (sin ejecutarla): copiar
`src/modules/<id>` fuera del proyecto, desinstalar con «Eliminar datos», volver a
pegar la carpeta e instalar. El catálogo reconoce el `manifest.ts` como disponible;
la instalación registra el módulo, regenera esquema/artefactos y crea una migración
propia (`CREATE TABLE`). Se conservan código, `@action`, `@onchange`, vistas
expulsadas y manifest; llegan vacíos datos, historial y asignaciones de usuarios a
grupos (los grupos se recrean desde el manifest). Esto demuestra que el módulo es
autocontenido: el comando sólo debe añadir validaciones y seguridad.

## Flujo previsto

1. Desarrollar y verificar el módulo en su proyecto de origen.
2. **Exportar**: ZIP con fuentes del módulo y un manifest de paquete.
3. **Importar** en el desarrollo del proyecto destino: validar, extraer en
   `src/modules/<id>` y registrar en el índice explícito.
4. `orm:sync` (o Instalar en Módulos) genera la migración **del proyecto destino**.
5. Probar, commit, merge a `main` y despliegue normal de ese proyecto.

El usuario sugirió `npm run orm:build -- <modulo> --dist` como posible empaquetado.
Nombres y opciones de los comandos de exportar/importar están por diseñar.

## Validaciones del comando

1. **Compatibilidad del framework**: el paquete declara la versión mínima y las
   capacidades usadas (p. ej. `@action`, One2many, related); rechazar si el destino
   no las soporta.
2. **Dependencias entre módulos**: declarar módulos requeridos (p. ej. Tickets →
   Flota) y exigir que estén instalados en el destino, con versión compatible.
3. **Choque de ID**: rechazar si el ID ya existe, está reservado en
   `prisma/.app-retirements.json` o colisiona en rutas/tablas; nunca sobrescribir
   módulos ni vistas personalizadas.
4. **Limpieza del paquete**: sólo fuentes del módulo; excluir artefactos generados
   (`src/generated/orm/*`), `.env*`, credenciales, datos, BD, respaldos,
   `.module-operations`, `node_modules`, `.next` y clientes Prisma.
5. **Datos iniciales opcionales**: un seed de catálogos separado y explícito, nunca
   datos reales.
6. **Seguridad de extracción**: impedir path traversal y symlinks, acotar tamaños,
   preflight/dry-run; tratar el contenido como código de confianza que se revisa
   antes de cargar el manifest, sin prometer sandbox para TS/JS.

## Lo que nunca viaja

Datos reales, asignaciones de usuarios a grupos, historial/notas, migraciones,
hashes/propiedad de la instalación de origen ni secretos.

## Criterios de aceptación

- Exportar e importar con preflight/dry-run y mensajes claros por cada validación.
- Reutilizar índice estático, validaciones del generador/scaffold e instalación del
  gestor; sin importación dinámica que eluda el build de Next.
- El destino genera su propia migración y propiedad; trazabilidad de origen y versión.
- Pruebas en proyectos y esquemas desechables: módulo con y sin dependencias,
  versión incompatible, ID duplicado/reservado, paquete con archivos prohibidos,
  path traversal, y preservación de personalizaciones.
- Guía en `docs/` con el flujo completo hasta producción del proyecto destino.

Relacionado: [Módulos declarativos](../modulos-declarativos.md),
[gestor de módulos](../gestor-modulos.md) y
[estrategia de entornos](entornos-bases.md) (define el despliegue del destino).
