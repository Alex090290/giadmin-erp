# Entornos, ramas y PostgreSQL local

Configuración local verificada el 2026-11-15. Se conservan Prisma 7.10.1 y PostgreSQL
18.3 en Docker. La rama observada al configurar fue staging_v1.

| Uso | Ramas | Archivo | Conexión del host | Base | Contenedor / volumen |
| --- | --- | --- | --- | --- | --- |
| Desarrollo | staging_v1, staging_v4, codex/flota y otras de trabajo | .env.development.local | localhost:5433 | liteerp4_dev | liteerp4_dev / liteerp4_dev_data |
| Producción local | main | .env.production.local | 127.0.0.1:5434 | lite_erp4_production | liteerp4_production / liteerp4_production_data |

Producción se creó **vacía**, según petición expresa: no se copiaron datos,
no se ejecutaron migraciones ni seed. Al verificar conectaba con cero tablas de
public. Desarrollo conectaba con diez tablas; no se cambió su contenido.
El antiguo postgres18 y sus volúmenes se conservaron. También se dejó intacto el
volumen previo lite_erp4_production_data (distinto del nuevo liteerp4_production_data).

## Cómo se elige la base

Git elige el código; el comando y NODE_ENV eligen el ambiente. Cambiar de rama
no modifica archivos privados ignorados. No usar NODE_ENV=staging_v1/staging_v4:
Next sólo admite development, production y test.

- npm run dev usa development y .env.development.local.
- Prisma CLI usa prisma7.config.ts: production carga .env.production.local;
  los demás casos cargan .env.development.local. DATABASE_URL exportada en la
  terminal tiene precedencia; revisar/unset DATABASE_URL si apunta a otro ambiente.
- Next prioriza process.env, .env.<NODE_ENV>.local, .env.local, .env.<NODE_ENV>, .env.
- .env.local conserva credenciales compartidas de la app y DATABASE_URL alineada
  con desarrollo para scripts legacy que lo cargan expresamente. No poner allí
  la conexión de producción. Se retiró la URL ficticia mydb de .env.

Los comandos explícitos nuevos cargan la URL del ambiente elegido; rechazan una
DATABASE_URL exportada que difiera del archivo. deploy/build/start de producción
exigen main; check/status son de lectura y pueden usarse en cualquier rama.
La guarda local no sustituye roles PostgreSQL, revisión de migraciones ni el proceso
CI. Los comandos habituales anteriores siguen existiendo; no prometer que cambiar
la rama seleccione automáticamente producción o que todos los accesos SQL estén
protegidos por este wrapper.

## Desarrollo

```bash
npm run db:check
npm run dev
# Sólo si modificas campos/esquema:
npm run orm:sync -- flota
```

El contenedor existente se arranca con docker start liteerp4_dev. Durante esta
configuración estaba sin red conectada; se recuperó mediante docker network connect
bridge liteerp4_dev, conservando el contenedor y volumen. No repetir la conexión
si ya está conectado. El puerto externo es 5433; dentro del contenedor es 5432.
No usar la base de producción para testear orm:sync.

## Producción, cuando se vaya a desplegar

Primero integrar y revisar los cambios necesarios en main (estos comandos nuevos
están en los cambios actuales; no se hicieron commit/push/merge automáticamente).
Después de revisar las migraciones que main va a aplicar:

```bash
npm run db:check:production
npm run db:status:production
npm run db:deploy:production
npm run build:production
npm run start:production
```

status puede terminar con código distinto de cero si hay migraciones pendientes;
no las aplica. deploy aplica migraciones versionadas con prisma migrate deploy,
sin migrate dev/reset/seed. Estos comandos de despliegue **no se ejecutaron** al
configurar las bases. Una BD vacía no permite usar el ERP hasta desplegar su esquema
y preparar el acceso inicial conforme al procedimiento del proyecto.

No abrir producción y dev en el mismo puerto HTTP; para otro puerto de la app,
por ejemplo PORT=3001 npm run start:production. No cambia los puertos PostgreSQL.

## Docker de producción

Compose versionado: docker/compose.production-db.yml. Arranque:

```bash
docker compose -f docker/compose.production-db.yml up -d
```

Usa la imagen oficial postgres:18.3, volumen dedicado y publica sólo en loopback
127.0.0.1:5434. Docker lee .env.docker.production.local con POSTGRES_USER,
POSTGRES_PASSWORD y POSTGRES_DB. Prisma/Next leen .env.production.local con
DATABASE_URL correspondiente. La contraseña nueva se generó localmente y no se
incluye en este documento ni en Git. Cambiar POSTGRES_PASSWORD en el archivo no
rota el password de un volumen inicializado: realizar una rotación explícita y
coordinada cuando sea necesaria. No ejecutar down -v para detener servicios.

En esta máquina el binario Docker existe en
/Applications/Docker.app/Contents/Resources/bin/docker, pero no estaba en PATH de
la sesión del agente. En tu terminal puedes usar docker si ya está disponible;
si no, usar esa ruta completa o habilitar las herramientas CLI desde Docker Desktop.

## Secretos y otras máquinas/worktrees

.env*, .env.docker.production.local y .environment-backups/ están ignorados. Los
archivos modificados de configuración privada se respaldaron localmente antes de
editar; las copias tienen permisos restringidos. No subirlos a Git ni compartirlos
por el chat. Mantener coherentes las URLs y los datos iniciales de Docker.

Un nuevo clon/worktree necesita sus propios archivos privados y acceso a los
contenedores correspondientes. No se transfieren por cambiar de rama o hacer pull.
Las ramas de desarrollo pueden compartir liteerp4_dev si su historial/esquema es
compatible; para cambios de esquema divergentes usar otra base/volumen de desarrollo,
no revertir migraciones sobre datos existentes para igualar una rama antigua.

## Verificación realizada

- Conexión real con el constructor Prisma de la aplicación, misma configuración
  UTC: desarrollo liteerp4_dev (10 tablas), producción lite_erp4_production (0).
- test:database-environment verifica main para producción, ramas de trabajo,
  checkout sin Git/detached y que la salida no incluya credenciales.
- TypeScript, ESLint de los scripts/helpers y git diff --check aprobados.
- Sin aplicación de SQL de negocio, migraciones, seed ni copias de tablas.
