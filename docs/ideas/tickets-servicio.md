# Siguiente guía: Tickets de servicio interno

Planeada el 2026-11-17 a petición del usuario como **siguiente tutoría después de
Flota**. Todavía no inicia: antes, el usuario quiere afinar otros módulos. No crear
el módulo, modelos, campos ni piezas del framework por anticipación.

## Propósito

Segundo piloto del framework para probar lo que Flota no cubrió: dependencias entre
módulos, folios, fecha sin hora, acciones con parámetros, Many2many y reglas de
acceso por rol. Dominio sencillo, sin dinero ni inventario (dinero/decimales quedan
para un piloto posterior tipo pedidos).

## Conceptos y cómo aparecen

| Concepto | En Tickets | ¿Existe hoy? |
| --- | --- | --- |
| Dependencias entre módulos | Solicitante/técnico como User/Partner; ticket ligado a un registro de otro módulo declarativo (Flota se retiró el 2026-11-17: elegir otro módulo o reinstalarla sólo si el usuario lo pide) | Parcial: Many2one a User existe; dependencia declarada entre módulos declarativos, no |
| Herencia/extensión de modelos | Añadir campos de Tickets a un modelo de otro módulo o a Partner (p. ej. departamento) | No; [propuesta de diseño](herencia-modelos.md) |
| Folio/secuencia | `TCK-0001` consecutivo, seguro en concurrencia | No |
| Fecha sin hora | Fecha compromiso/vencimiento | No (sólo DateTime UTC) |
| Acciones con parámetros | «Cerrar» con nota de resolución; «Reasignar» con técnico | No (`@action` recibe sólo el registro) |
| Many2many | Etiquetas y observadores | No |
| Reglas por registro | Solicitante ve los suyos; técnico los asignados; supervisor todos | Sí |
| Kanban con transiciones | Nuevo → En proceso → En espera → Resuelto → Cerrado | Sí |
| Efectos fuera de la transacción | Aviso al técnico al asignar (afterCommit/cola) | No; dejar al final |
| Adjuntos | Evidencias/fotos | No; dejar al final |

## Ritmo acordado

A diferencia de Flota, varias piezas no existen. Ciclo por concepto:

1. El usuario escribe el módulo hasta toparse con lo que falta.
2. Se diseña la pieza, se presenta la propuesta y, con aprobación, el agente la
   implementa en el framework con pruebas y demo ficticia en `/sample`.
3. El usuario la aplica en Tickets como ejercicio.

Cada pieza nueva nace del caso real; sin abstracciones por anticipación.

## Orden propuesto

1. Base: módulo y modelo Ticket (título, descripción, prioridad, estado), solicitante
   y técnico como User — posible con el framework actual.
2. Folio al crear.
3. Fecha compromiso (Date).
4. Kanban y reglas por registro por rol.
5. Acciones con parámetros: Cerrar y Reasignar.
6. Many2many: etiquetas y observadores.
7. Dependencia con otro módulo declarativo (Flota está retirada): vincular un registro y definir el comportamiento al desinstalar el módulo requerido.
8. Extensión de un modelo ajeno (herencia), si el caso lo pide:
   [propuesta](herencia-modelos.md).
9. Avisos y adjuntos.

## Límites

- Flota está retirada desde el 2026-11-17; no reinstalarla ni recuperar su código salvo petición expresa.
- Tutoría a ritmo del usuario: explicar y verificar un paso a la vez.
- Pruebas del framework con fixtures/esquemas propios, nunca datos reales.
- Considerar antes la [estrategia de entornos](entornos-bases.md) si la guía llega a
  requerir despliegue.
