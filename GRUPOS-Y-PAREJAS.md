# Grupos por torneo y fotos de dobles

## Qué cambia

- `torneo_grupos`: categoría y nombre del grupo, independiente de los partidos.
- `torneo_grupo_parejas`: una asignación por pareja y torneo. La categoría aquí no modifica la categoría general de la pareja ni del jugador.
- La migración de arranque solo crea estas dos tablas; no carga propuestas, no crea partidos y no modifica resultados existentes.
- Grupos y parejas se guardan juntos con transacción, bloqueo del torneo y revisión de versión para evitar sobrescribir otro administrador.
- Crear/editar un partido de grupos exige dos parejas del mismo grupo y categoría, sin repetir cruce ni jugadores en ambos lados. Las sustituciones supervisadas también validan la distribución. Eliminatorias pueden enfrentar grupos distintos de la misma categoría.
- Las posiciones incluyen las parejas asignadas aunque tengan cero partidos. Inscritos sin grupo e incidencias históricas se muestran aparte; cruces incompatibles o duplicados no suman a un grupo incorrecto.
- El balance 2/1 sigue siendo orientativo: no calcula clasificados ni un cuadro de eliminación.
- Tarjetas de partido, detalle y pantalla muestran los dos avatares, conservando nombre e iniciales si faltan fotos.

## Puesta en marcha

1. Hacer respaldo habitual antes de desplegar backend y frontend juntos.
2. Entrar como administrador a Tenis → Torneos → torneo → Parejas inscritas.
3. Crear los grupos por categoría y asignar cada pareja. Los grupos pequeños se conservan sin relleno.
4. Opcional: si todavía no hay grupos, cargar una propuesta JSON con la estructura de `scores-api/data/grupos-abierto-2026.json`. Solo se incluyen IDs que continúen inscritos; revisar inferencias y pendientes antes de guardar. La propuesta anterior NO certifica cambios hechos después por los organizadores.
5. Guardar grupos. Revisar las incidencias de partidos ya creados y corregirlos desde administración, sin borrar resultados para ocultar inconsistencias.
6. Al crear partidos, seleccionar torneo, categoría, grupo y las dos parejas disponibles. No escribir nombres de grupo libremente para torneos de dobles con grupos.

Los cambios de esta entrega son locales. No se volvió a ejecutar la inscripción interrumpida, no se usaron las credenciales compartidas en esta entrega ni se hicieron nuevas escrituras en producción. Subir/desplegar y guardar la distribución son pasos distintos: desplegar no asigna automáticamente a nadie.
