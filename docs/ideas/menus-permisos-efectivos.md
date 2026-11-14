# Menús según permisos efectivos

Pendiente solicitado el 2026-11-14, sin implementación autorizada por esta nota.

## Problema comprobado en código

Los menús ya filtran por pertenencia a grupos y acceso admin/authenticated.
En módulos declarativos, los grupos de lectura se derivan del manifest; la
navegación no consulta modelPerms para incorporar los ajustes de permisos
guardados en Control de accesos. Un usuario puede seguir viendo el enlace a un
modelo cuya lectura fue desmarcada mediante un override. La captura aportada
por el usuario muestra los enlaces de Configuración; no se repitió en navegador.

## Objetivo y aceptación

- Ocultar enlaces de modelos cuando el usuario no tenga lectura efectiva,
  considerando grupos heredados, permisos acumulados y overrides almacenados.
  Si otro grupo concede lectura, conservar el enlace.
- Ocultar grupos de menú vacíos, como Configuración sin hijos accesibles, y
  revisar coherencia del cajón y la ruta de entrada para evitar destinos sin
  acceso. Preservar orden, etiquetas y vistas personalizadas.
- Conservar superusuario y contratos de aplicaciones manuales; evitar consultas
  por enlace, cargar permisos en lotes por petición y no compartir caché privada
  entre usuarios. Reflejar cambios de asignación/permisos al actualizar navegación.
- La visibilidad sigue siendo presentación. Rutas y operaciones deben mantener
  autorización de servidor aunque se entre por URL directa. No ocultar un menú
  sólo porque una lista esté vacía o una regla limite algunos registros.
- Probar overrides que quitan/restauran lectura, varios grupos, herencia, menú
  vacío, superusuario y acceso directo denegado, con fixtures propios.

Siguiente paso al retomarlo: diseñar la proyección de capacidades efectivas para
la navegación y su actualización, reutilizando el motor de acceso sin duplicar
sus reglas. No concede permisos a modelos relacionados ni implementa permisos
por campo; esos problemas tienen alcances independientes.

Referencias: src/lib/applications/navigation.ts, src/lib/modules/define.ts,
src/lib/access/current.ts y src/lib/access/engine.ts.
