# Integración ZIP 8

Se contrastó el código del ZIP con la versión actual, conservando ayuda, autenticación, fotos, cola de puntos y push existentes.

## Cambios incorporados

- Tenis → Torneos → detalle: partidos filtrables, parejas inscritas por categoría y posiciones. Consultas públicas limitadas a datos deportivos.
- Administración → Torneos → Detalle e inscripciones: selección múltiple de parejas activas, con búsqueda y categoría. Solo administradores pueden escribir. No se genera programación automática ni se habilita autoinscripción de miembros. En individual se conservan partidos y resultados, sin presentar un selector de parejas.
- Validación íntegra de lotes (hasta 200), transacción y bloqueo del torneo para serializar altas; reintentos actualizan las inscripciones existentes sin crear otras. Retirada bloqueada con partidos no cancelados. No se copió la creación de un índice único con errores ignorados ni se borraron duplicados históricos.
- Posiciones: dobles de tenis usa IDs de parejas, grupos separados por categoría; cancelados y finalizados sin ganador no suman. Balance 2 por victoria / 1 por derrota del ZIP, explícitamente orientativo. No se designan dos clasificados por grupo. La clasificación oficial sigue dependiendo de la organización.
- Compatibilidad de notificaciones: conserva INT/BIGINT y signedness del ID al crear la relación push. Estados de lectura antiguos se relacionan también por destinatario, no por cualquier usuario. No se ignoran fallos de esquema.
- Barra pública móvil compacta con menú accesible; mesa de juez con menú compacto. Fondo compartido en vistas públicas y administración, con pausa persistente y movimiento reducido. La ayuda conserva su animación propia; mesa de juez y pantalla no incorporan el fondo decorativo.

## Exclusiones y verificación

No se importaron credenciales PDF, variables privadas ni scripts `seed_tournament`/`seed_full_tournament`; no se ejecutaron cargas de prueba, borrados ni cambios en producción. No se copiaron archivos antiguos encima de autenticación o marcador. La tabla `inscripciones` forma parte del esquema existente.

Pruebas del servidor con base simulada, compilación y pruebas de navegador con respuestas simuladas. La compatibilidad con una base antigua se prueba con tipos representativos; no se inspeccionó la base real. Antes del despliegue, conservar un respaldo habitual y comprobar logs de migración. No se ha subido a main ni desplegado.
