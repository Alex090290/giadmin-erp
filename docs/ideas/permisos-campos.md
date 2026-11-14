# Permisos por campo y presentación por grupo

Pendiente solicitado el 2026-11-14. Sin implementación autorizada por esta nota;
no sustituye el siguiente ejercicio de grupos/permisos de Flota.

## Objetivo y alcance

Ampliar el sistema actual de grupos, permisos por modelo y reglas de registro
para admitir restricciones de lectura/escritura por campo y condiciones de
interfaz por grupo: invisible, readOnly, required y visibilidad de NotebookPage.
Buscar una declaración coherente con Fields/modelos y manifest, conservando TSX
personalizable. La sintaxis y la distribución exacta de responsabilidades están
por diseñar; no hay una API nueva disponible.

Distinguir permisos sobre datos de presentación: ocultar un Field o una pestaña
no impide leer su payload ni escribirlo desde una petición. El invisible actual
conserva valores y validación. La obligatoriedad de negocio debe comprobarse en
el servidor, sin que una prop de UI relaje constraints o reglas del modelo.

## Diseño pendiente y criterios de aceptación

- Definir composición de grupos, herencia, overrides, superusuario y políticas
  por defecto, preservando los contratos actuales cuando no se declaren opciones.
- Revalidar permisos por campo junto con sesión, modelo y reglas de registro en
  las transacciones. No enviar valores sin lectura ni aceptar cambios sin
  escritura, incluyendo peticiones construidas fuera de la UI.
- Diseñar contratos parciales, defaults y esquemas de guardado: omitir un campo
  restringido no debe borrarlo ni causar una escritura involuntaria. Resolver
  creación y required sin generar formularios imposibles de guardar ni relajar
  restricciones SQL; no prometer que bastará con modificar componentes.
- Revisar todos los canales de salida/entrada: formularios, colecciones,
  búsqueda/filtros/orden/grupos, lookups, displayName/título de pestaña, related,
  compute, reacciones, historial/notas y acciones del modelo. Las dependencias y
  resultados derivados no deben revelar datos restringidos. Definir explícitamente
  cómo operan hooks y acciones autorizadas sobre campos no editables por el actor.
- Publicar al cliente sólo capacidades y metadatos autorizados para adaptar los
  Fields y NotebookPage. Conservar RHF/Zod, navegación, revisión, auditoría y vistas
  personalizadas; condiciones React siguen siendo presentación.
- Probar con cuentas/grupos de fixture lectura denegada, escritura falsificada,
  combinaciones de grupos, cambios de asignación, required, pestañas y borradores;
  incluir demo ficticia y documentación. No aplicar cambios a Flota por anticipación.

No se presupone una migración SQL de los modelos de negocio; evaluar durante el
diseño si hacen falta cambios en el almacenamiento de políticas u overrides.

Siguiente paso al retomar: diseñar un caso pequeño con ejemplos de declaración,
payload autorizado y guardado antes/después, y acordar el contrato antes de
implementar. Beneficio esperado: evitar condiciones/permisos duplicados entre
vistas y servidor sin ocultar los límites de autorización.

## Referencias

- [Control de accesos actual](../modulos-declarativos.md#5-control-de-accesos).
- [Estado y siguiente ejercicio](../estado-proyecto.md).
- [Plan de módulos declarativos](modulos-declarativos.md).
