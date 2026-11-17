# Módulos distribuibles

Pendiente solicitado por el usuario el 2026-11-15. Sólo documentación: no implementar
por esta nota ni interrumpir la tutoría de Mantenimiento para adelantarlo.

## Alcance acordado

Distribuir un módulo como ZIP de código fuente para incorporarlo al repositorio
antes de compilar/desplegar. No es instalación dinámica, carga desde la UI de
producción ni ejecución de un ZIP dentro del servidor que ya está corriendo.

Flujo previsto:

1. Desarrollar y verificar el módulo.
2. Empaquetar sus fuentes, manifest y requisitos de compatibilidad en ZIP.
3. Descomprimir y colocar el scaffold en src/modules/<id> del proyecto destino.
4. Ejecutar un comando que valide y reconozca el módulo, registrándolo en el índice
   explícito mediante las protecciones y utilidades ya existentes.
5. Sincronizar/probar en desarrollo y preparar/revisar migraciones del proyecto
   destino; integrar a main, compilar/desplegar normalmente y aplicar migraciones
   en producción mediante el flujo explícito del repositorio.

El usuario sugirió inicialmente npm run orm:build -- <modulo> --dist como posible
comando de empaquetado. Nombre, opciones y comando de reconocimiento aún por
diseñar; no existen ahora ni se presentan como API disponible.

## Criterios al retomarlo

- Manifest del paquete con ID, versión, compatibilidad del framework y dependencias;
  validar versiones y módulos requeridos antes de registrar o modificar archivos.
- Fuentes editables TS/TSX y recursos exclusivos necesarios. Excluir credenciales,
  archivos .env, datos de desarrollo, BD, respaldos, node_modules, .next, cachés y
  clientes Prisma generados. Revisar imports y dependencias externas del módulo.
- No copiar ciegamente migraciones globales ni hashes/propiedad de otra instalación:
  diseñar incorporación al historial y esquema del destino, conservando trazabilidad.
- Preflight/dry-run, detección de ID/rutas duplicadas y colisiones; no sobrescribir
  módulos/vistas personalizados ni importar desde rutas fuera del alcance aprobado.
- Tratar el contenido como código local de confianza que se revisa antes de cargar
  el manifest. Si hay extracción asistida, impedir path traversal/symlinks y acotar
  tamaños; validar contenido y procedencia sin prometer sandbox para TS/JS.
- Reutilizar el índice estático y las validaciones del generador/scaffold. No
  reinventar registro ni añadir importación dinámica para eludir el build de Next.
- Probar exportación/incorporación en proyectos y esquemas desechables, permisos,
  conflictos, dependencias, cambios de versión y preservación de personalizaciones.

No transporta registros de desarrollo ni instala selectivamente módulos por base
en producción. Ese gestor y Exportar a Excel tienen alcances separados.

Referencias: [Módulos declarativos](../modulos-declarativos.md). La estrategia de
entornos/bases se revirtió el 2026-11-17 y está pendiente de replantear.
