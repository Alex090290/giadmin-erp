# Pendiente: ampliación de Accesos

Estado: pendiente, por decisión del usuario el 2026-11-16.

Se retiraron las implementaciones recientes del catálogo de modelos/Fields y la
visibilidad de menús por grupo. El usuario quiere revisar su funcionamiento y
metodología antes de retomarlas. Sus fuentes anteriores se conservan en Git;
no se consideran un contrato vigente ni deben reactivarse por anticipación.

Se mantiene el Accesos básico: grupos declarados en los módulos, asignación de
miembros, ajustes CRUD y activación de reglas de registro. También se conserva el
ORM y la protección de las líneas One2many según el acceso a su padre.

## Alcance futuro por diseñar

- Catálogo administrativo de modelos y Fields desde sus declaraciones en código.
- Visibilidad de aplicaciones, menús y vistas por grupo.
- Campos ocultos, de sólo lectura y obligatorios; autorización de lectura/escritura
  en servidor, con contratos parciales y dependencias relacionadas/calculadas.
- Composición de varios grupos, herencia, alcance por registro y excepciones de
  administrador, con ejemplos pequeños que el usuario pueda comprobar.
- Edición de políticas, concurrencia, migraciones y reversión documentadas.

Antes de implementar, acordar ejemplos concretos de qué debe ver y poder hacer
cada perfil. Mostrar u ocultar elementos no debe sustituir la autorización de
operaciones ni exponer datos que el servidor deba proteger.

## Reversión

No borrar ni editar la migración ya aplicada que creó access_menu_hidden. Una
migración posterior, 20261117013335_revert_menu_visibility, retira esa tabla.
Respaldar sus filas antes de aplicarla en una base existente. No modificar las
tablas anteriores de usuarios, miembros, overrides CRUD o reglas.

La reversión de desarrollo se aplicó el 2026-11-16 (fecha local): tabla vacía,
respaldo privado en .environment-backups, migraciones anteriores conservadas.
La migración de retirada permanece versionada para otros entornos; no se aplicó
en producción. Los grupos, miembros y reglas previos se conservaron.
