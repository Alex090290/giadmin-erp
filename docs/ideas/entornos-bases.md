# Estrategia de entornos y bases de datos

Pendiente solicitado el 2026-11-17, después de revertir la separación por
ambientes del 2026-11-15. **Sólo planeación**: no crear archivos `.env.*`,
comandos, contenedores ni despliegues hasta acordar la estrategia con el usuario.

## Situación actual

- Una sola `.env.local` con la base de desarrollo, leída por Next, Prisma
  (`prisma7.config.ts`) y los scripts.
- Las bases y contenedores que ya existen no se borraron: en Windows,
  `lite-erp4-production` (vacía) está en el mismo servidor que `lite-erp4`. En la
  Mac siguen los contenedores de desarrollo y producción de la configuración anterior.
- Respaldo de los archivos privados de Windows en `.environment-backups/revert-*`.

## Problemas que motivaron la reversión

1. Varias herramientas cargan `.env.local` por su cuenta (`module:manage`,
   `prisma/seed.ts` ejecutado directo, integraciones) y no la misma fuente que
   Next/Prisma; con `.env.local` hacia producción operaban sobre producción.
2. `npm run build` y `npm run start` cargaban `.env.production.local` desde
   cualquier rama; la guarda de `main` sólo existía en los comandos nuevos.
3. Producción y desarrollo compartían servidor y rol superusuario `postgres`: una
   URL equivocada bastaba para escribir en producción.
4. La documentación describía una sola máquina (Mac); Windows tenía otros nombres,
   puertos y sin Docker en el PATH.
5. Secretos compartidos entre ambientes (`AUTH_SECRET`, `AUTH_URL`, Cloudinary).
6. Los archivos privados no viajan por Git; cada máquina queda configurada distinto.

## Preguntas a decidir

- ¿Producción será local o un servidor/hosting real? ¿Quién despliega y desde dónde?
- ¿Cuántas máquinas y ramas de desarrollo; comparten base o cada una la suya?
- ¿Docker en todas las máquinas o PostgreSQL instalado? ¿Contenedor aparte para
  producción?
- ¿Qué secretos deben ser distintos por ambiente (auth, Cloudinary, carpetas)?
- ¿Producción parte vacía, con seed mínimo o con copia de datos? ¿Cómo se crea el
  primer administrador?
- ¿Qué pasa con las bases ya creadas (`lite-erp4-production`, contenedores de la
  Mac): reutilizar, conservar sin uso o retirar con aprobación?

## Criterios de aceptación

- Una única fuente de configuración por ambiente, compartida por Next, Prisma y
  **todos** los scripts (sin `config({ path: ".env.local" })` dispersos).
- Ninguna herramienta de desarrollo (module:manage, orm:sync, seed, integraciones)
  puede conectarse a producción: rechazo explícito comparando con el destino de
  producción, no sólo por `NODE_ENV`.
- Build/start/migraciones de producción sólo mediante un flujo explícito y
  revisado; producción con rol propio sin superusuario.
- Secretos separados por ambiente y nunca en Git ni en el chat.
- Guía con la parte común a todas las máquinas y una lista de preparación por
  máquina (archivos privados, Docker/PostgreSQL, comprobación de lectura).
- Pruebas de las guardas y comprobación real de lectura en cada ambiente, sin
  modificar datos.
