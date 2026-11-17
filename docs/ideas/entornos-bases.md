# Estrategia de entornos y bases de datos

Pendiente solicitado el 2026-11-17, después de revertir la separación por
ambientes del 2026-11-15. **Estrategia acordada el 2026-11-17 (abajo); todavía sin
implementar.** No crear archivos `.env.*`, comandos, contenedores ni despliegues
hasta que el usuario autorice la implementación.

## Estrategia acordada (2026-11-17)

Principios: las bases se separan **por entorno, no por rama**; cambiar de rama nunca
elige la base, y una máquina de desarrollo **no tiene credenciales de producción**.

### Entornos

| Entorno | Dónde | Base | Datos |
| --- | --- | --- | --- |
| Desarrollo | Cada máquina (Windows y Mac), PostgreSQL local en Docker | `liteerp4_dev` (en Windows hoy `lite-erp4`) | Ficticios, desechables, recreables con seed |
| Pruebas | Esquemas temporales de cada suite | `*_test_<hex>` | Se eliminan solos (ya funciona) |
| Producción | **Máquina Windows**, Docker Compose en una carpeta aparte con sólo `main` | Contenedor propio | Reales, con respaldos fuera de la máquina |

- **Producción vive en una sola máquina (Windows), nunca en ambas.** La Mac sólo es
  desarrollo y no tiene configuración ni credenciales de producción.
- Las bases de desarrollo de cada máquina son independientes: el código y las
  migraciones viajan por Git; los datos no se sincronizan.
- Ramas: todas comparten la base de desarrollo mientras el esquema sea compatible
  (migraciones aditivas). Sólo una rama con cambios incompatibles usa una base
  temporal `liteerp4_dev_<rama>`, que se elimina al hacer merge.
- Staging (copia anonimizada de producción para ensayar migraciones): opcional,
  más adelante.

### Configuración

- Desarrollo: una sola `.env.local` por máquina, leída por Next, Prisma y todos los
  scripts a través de **un helper único** (sin `config({ path })` dispersos).
- Producción: variables en un `.env` que existe **sólo en la carpeta de producción**
  de la máquina Windows, fuera de la carpeta de trabajo y fuera de Git.
- `APP_ENV=development|production` en cada entorno. `NODE_ENV` indica cómo corre
  Next; `APP_ENV`, dónde. Un `build`/`start` local es válido (`NODE_ENV=production`,
  `APP_ENV=development`) y usa la base de desarrollo.
- Las herramientas de desarrollo (`module:manage`, `orm:sync`, seed, integraciones)
  se niegan a correr si `APP_ENV` no es `development`.
- Secretos distintos por entorno: `AUTH_SECRET` propio y carpeta/cuenta de
  Cloudinary de producción.

### Producción con Docker Compose (máquina Windows)

| Servicio | Función |
| --- | --- |
| `app` | Next.js `output: "standalone"`, imagen construida en la propia máquina desde `main`, con `prisma generate` en el build |
| `db` | PostgreSQL 18.3, volumen persistente, sólo red interna de Docker, rol propio sin superusuario |
| `migrate` | Contenedor de un uso que ejecuta `prisma migrate deploy` antes de arrancar `app` |
| `proxy` | Caddy/Nginx; publica en la red local si otras personas lo usan |

- Respaldos: `pg_dump` programado (Programador de tareas de Windows) guardado fuera
  de la máquina (disco externo o nube); probar una restauración.
- Despliegue en un comando, sólo en la carpeta de producción y en `main`:
  respaldo → `git pull` → `docker compose build` → `migrate` → `up -d`.
- La app Módulos queda bloqueada en producción: los módulos llegan por Git y las
  migraciones por `migrate deploy`; nunca `orm:sync` ni `migrate dev` en producción.
- Consideraciones de Windows: Docker Desktop (backend WSL2) con las herramientas de
  línea de comandos en el PATH; `.gitattributes` con LF para scripts que corren en
  el contenedor; evitar que la máquina suspenda mientras sirve; producción y
  desarrollo comparten CPU/memoria.

### Flujo de un cambio

Desarrollo en rama (cualquier máquina) → `orm:sync` genera la migración → commit y
PR con revisión del SQL → merge a `main` → en la carpeta de producción de Windows,
comando de despliegue.

### Implementación propuesta (pendiente de autorización)

1. Helper único de configuración y `APP_ENV`; migrar todos los scripts a él y
   añadir las guardas de herramientas de desarrollo, con pruebas.
2. `output: "standalone"`, `Dockerfile` multi-etapa, `compose.production.yml` y
   `.gitattributes`.
3. Comando de despliegue y de respaldo/restauración.
4. Guía `docs/` común + lista de preparación por máquina (Windows: dev + producción;
   Mac: sólo dev).
5. Decidir el destino de `lite-erp4-production` (vacía, en el servidor de desarrollo
   de Windows) y de los contenedores de producción anteriores de la Mac: retirar
   sólo con aprobación.

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

## Preguntas aún abiertas

- ¿Producción parte vacía, con seed mínimo o con copia de datos? ¿Cómo se crea el
  primer administrador?
- ¿Otras personas usarán producción por la red local (proxy y HTTPS en LAN)?
- Destino de las bases ya creadas (ver paso 5 de la implementación).

## Criterios de aceptación

- Una única fuente de configuración por ambiente, compartida por Next, Prisma y
  **todos** los scripts (sin `config({ path: ".env.local" })` dispersos).
- Ninguna herramienta de desarrollo (module:manage, orm:sync, seed, integraciones)
  puede conectarse a producción: rechazo explícito por `APP_ENV`, no sólo por
  `NODE_ENV`; y la máquina de desarrollo no tiene credenciales de producción.
- Build/start/migraciones de producción sólo mediante el flujo explícito desde
  `main` en la carpeta de producción; rol PostgreSQL propio sin superusuario.
- Secretos separados por ambiente y nunca en Git ni en el chat.
- Guía con la parte común y una lista de preparación por máquina.
- Pruebas de las guardas, comprobación real de lectura en cada ambiente sin
  modificar datos, y una restauración de respaldo probada.
