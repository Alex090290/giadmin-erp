# Visibilidad de menús por grupo

En **Accesos → Grupos → un grupo → Visibilidad de menús**, un administrador elige:

- **Según manifest**: elimina la ocultación propia de ese grupo. Se siguen
  comprobando las condiciones del manifest y los permisos de lectura existentes.
- **Oculto**: retira ese menú de la navegación de los miembros del grupo y de los
  grupos que lo heredan.

Guardar menús persiste la configuración y revalida el layout del ERP. Los demás
usuarios ven el cambio al recargar su navegación (no hay actualización en tiempo
real entre sesiones). Los usuarios
se asignan en la sección Miembros del mismo grupo; no se asignan menú por menú.

## Composición y alcance

Una ocultación de cualquiera de los grupos efectivos prevalece. No hay una opción
«forzar visible» que amplíe permisos o deshaga la restricción de otro grupo.
Restaurar Según manifest en un grupo no elimina las ocultaciones heredadas; la
pantalla indica sus grupos de origen. Para revertir una ocultación heredada hay
que cambiarla en el grupo que la declara.

Ocultar un dropdown oculta todas sus opciones; ocultar la última opción visible
hace desaparecer el dropdown vacío. Los IDs de menú están separados por aplicación,
por lo que un ID igual en otra aplicación no recibe la misma política. Los
administradores conservan la navegación, evitando bloquear el propio gestor.

Esto es una política de presentación: no revoca el acceso directo por URL, ni
concede acceso a registros, acciones o aplicaciones. El servidor conserva sus
permisos CRUD y reglas de registro. Tampoco cambia el cajón de aplicaciones si se
ocultan todos los menús; la visibilidad de una aplicación sigue su contrato actual.

El editor registra los menús de las aplicaciones nativas del framework y módulos
`defineModule`. Los manifests nativos consumen `definition.ts`, metadatos sin
iconos que también usa el catálogo. Los módulos declarativos mantienen su manifest
habitual. El scaffold anterior con manifests personalizados necesita publicar un
descriptor sin React para incorporarse al editor; su navegación anterior permanece.

Conservar los IDs al cambiar etiquetas o rutas. Renombrar un ID crea una identidad
nueva y requiere revisar la configuración; no se trasladan restricciones por
coincidencia de textos. Las políticas de módulos retirados se conservan con keep;
la purga elimina las de su aplicación y las de sus grupos, con el procedimiento
existente de revisión/respaldo.

## Persistencia y concurrencia

`AccessMenuHidden` (`access_menu_hidden`) almacena únicamente ocultaciones, con
clave compuesta grupo/aplicación/menú. Grupos y menús siguen declarados en código;
no se crean copias editables de los manifests. El snapshot de acceso lee una vez
las políticas de los grupos efectivos por petición, sin caché entre usuarios.

Cada guardado requiere administrador activo y sesión vigente en una transacción
Serializable. Se rechazan grupos/menús desconocidos, duplicados y modos no
permitidos antes de escribir. El editor entrega una revisión calculada del
catálogo y la configuración propia/heredada; si cambió mientras se editaba,
se rechaza el guardado y se pide recargar. Ningún lote parcialmente inválido se
aplica por partes.

## Migración

Migración aditiva: `20261116221339_add_menu_visibility`. Sólo crea la tabla común
`access_menu_hidden` y su clave primaria; no cambia registros ni permisos actuales.
Sin filas en ella, se conserva la navegación previa.

Debe aplicarse antes de usar este código contra una base existente. Seguir los
[comandos de entornos](entornos-y-bases.md): desarrollo y producción son bases
distintas; no aplicar en producción como parte de pruebas. El despliegue habitual
aplica migraciones versionadas y genera Prisma Client antes de arrancar la app.

## Verificación

- `test:access`: lectura agrupada, herencia, membresías desconocidas y bypass admin.
- `test:applications`: enlaces, dropdowns, separación por aplicación y ausencia de
  concesiones adicionales.
- `test:capabilities:integration`: persistencia/restauración, grupo heredado,
  permisos de datos intactos, sesión/rol, revisiones obsoletas y lotes inválidos,
  usando proyecto/esquema PostgreSQL propios.
- `test:module-manager`: inspección acotada de definition.ts sin ejecutar código.

Las políticas de vistas y campos, incluida su protección de lectura/escritura en
servidor, siguen pendientes y no se deducen de estas ocultaciones de navegación.
