# Catálogo de modelos y campos en Accesos

En **Accesos → Modelos** (`/erp/accesos/modelos`), un administrador consulta los
modelos declarativos registrados y abre sus campos. La consulta reutiliza ListView:
búsqueda, filtros por texto, orden y paginación en servidor; no permite crear,
editar ni eliminar modelos desde esta pantalla.

La lista muestra etiqueta, identificador (`flota.vehicle`), aplicación, nombre del
contrato (`FlotaVehicle`) y cantidad de campos. Al abrir el modelo se muestran:

- Campos almacenados, con tipo y obligatoriedad.
- Campos relacionados y su ruta de origen.
- Campos calculados y outputs de vista previa, marcados como sólo lectura.
- Relaciones Many2one y colecciones One2many, con destino e inversa.
- La marca `sensitive` de los campos declarados; es información del contrato,
  visible sólo al administrador, no un editor de permisos.

El identificador del campo es estable mientras se conserven los nombres de código:
`<modulo>.<modelo>.<campo>`. El registro se deriva del manifest y de `defineModel`;
no se crea una copia en PostgreSQL ni hace falta un comando para registrar cada
Field. Los cambios de fuentes aparecen cuando el servidor carga la nueva definición.
La sincronización de campos persistidos conserva su procedimiento habitual.

## Alcance

Sólo modelos del registro declarativo `src/modules`. Las aplicaciones manuales y
el scaffold anterior con contratos propios no se presentan como si sus campos
estuvieran integrados. «Registrado» describe el código disponible en el servidor,
no una comprobación de que todas sus tablas estén instaladas en la BD.

No se publican valores de registros, defaults literales, resultados de factories,
schemas Zod, funciones de negocio ni configuración de subida de imágenes. El
catálogo tampoco enumera como Fields configurables los metadatos técnicos de ID,
revisión y auditoría. Las etiquetas/tipos sí son metadatos administrativos.

«Sólo lectura» indica una propiedad del campo (por ejemplo, compute/related),
no el permiso efectivo de un usuario sobre un formulario concreto.

## Autorización

La ruta pertenece a la aplicación Accesos, reservada a administradores. Cada
Server Action requiere administrador y el servicio vuelve a comprobar cuenta
activa, `isAdmin` y `sessionVersion` dentro de su transacción RepeatableRead.
Se valida cada página contra columnas y operadores fijados por el servidor;
no se aceptan modelos arbitrarios, dominios, campos o actores elegidos por cliente.
Los modelos inexistentes no se resuelven mediante importaciones dinámicas.

## Próximos pasos

El catálogo continúa siendo de consulta. La entrega posterior de
[menús por grupo](menus-por-grupo.md) añade políticas de navegación en la ficha del
grupo. Las políticas de vistas/campos, permisos por campo en servidor y creación
de grupos desde la UI siguen pendientes. Podrán referenciar los identificadores
de este registro, con validación de existencia y contrato de seguridad propio.

Verificaciones: `npm run test:access` comprueba proyección, ausencia de defaults y
funciones, búsqueda/filtros/paginación y autorización transaccional. La prueba
`npm run test:capabilities:integration` verifica lectura del catálogo y rechazo de
sesiones inválidas en su proyecto/esquema PostgreSQL temporal.
