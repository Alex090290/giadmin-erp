# Tickets de servicio interno: dirección del piloto

Idea registrada el 2026-11-17. La preparación del recorrido ya fue autorizada:
la **[guía vigente de Tickets desde cero](../tutorial-tickets.md)** sustituye el
orden preliminar de este documento. Los ejercicios todavía no han comenzado.
No crear módulos, modelos ni vistas por anticipación.

## Propósito

Aprender el framework desde su primer módulo y comprobar sus capacidades actuales
con una mesa de ayuda interna: tickets, clasificación, técnicos, intervenciones,
etiquetas y equipos. Sin dinero ni inventario. Usar módulos declarativos, negocio
en clases y presentación TSX. Avanzar un ejercicio por confirmación del usuario.

La guía cubre campos y folios, presentación/Many2one, ciclo de guardado, reacciones,
related/compute, formularios, colecciones, transiciones, parámetros, actividad,
One2many/Many2many, grupos/reglas/capacidades, dominios y ciclo de vida modular.
Un módulo auxiliar Recursos permitirá practicar dependencias e herencia entre
modelos declarativos. Flota permanece retirada y no se reinstala para este piloto.

## Distinciones que debe conservar la tutoría

- Dependencias y extensiones entre módulos declarativos ya existen. Las
  extensiones de Partner/User siguen pendientes; no son el ejercicio inicial.
- Técnico es primero un catálogo declarativo. Vincularlo a una cuenta exige una
  integración autorizada; su ID no equivale al ID del usuario autenticado.
- Folios, acciones con parámetros y Many2many declarativo ya están implementados.
  Many2many y parámetros Many2one no admiten destinos User/Partner manuales.
- La fecha compromiso usará DateTime UTC. Date sin hora no existe todavía.
- Adjuntos generales, avisos después del commit, compute persistido y permisos
  por campo quedan pendientes. Se diseñan cuando aparezca un caso real.
- La estrategia de entornos está pendiente: no desplegar como parte de esta guía.

## Siguiente paso

Ejercicio 0 de la [guía](../tutorial-tickets.md): revisar entorno y migraciones
pendientes de la máquina actual. Después proponer únicamente el dry-run de
create:module. El avance confirmado se registra en la guía y en
[estado-proyecto.md](../estado-proyecto.md).
