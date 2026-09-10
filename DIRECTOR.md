# Juez director — integración del ZIP 5

## Cambios incorporados

- Rol `juez_director`, creado o asignado exclusivamente por un administrador en Usuarios.
- Acceso por documento o alias; panel `/director`, mesa `/juez` y perfil. Sin patrocinadores ni navegación pública en su sesión.
- Panel con búsqueda, filtros, marcadores, reasignación de jueces, sustitución y cancelación/reactivación.
- Corrección supervisada de sets con motivo, sacador, confirmación y registro de auditoría.
- Se conservan las fotos, los nombres automáticos de parejas, el juez visible y la cola offline actuales. No se importaron `.git`, secretos, dependencias ni configuraciones del ZIP.

## Fallas detectadas y adaptación

1. La lista de jueces del ZIP exponía documento, correo y teléfono. Ahora entrega solo ID, nombre, apellido, rol y alias, a oficiales autenticados.
2. Las cancelaciones y reactivaciones no validaban estado ni eran atómicas. Ahora se bloquea la fila, se valida la versión, se confirma todo en una transacción y se registra quién lo hizo. Los resultados finalizados no se cancelan.
3. La sustitución confundía parejas de tenis con individuales y usaba campos distintos a la API actual. Se adaptaron modalidad, categoría e integrantes. Solo admite registros activos de la misma categoría/deporte, antes del inicio, sin historial, sin jugadores compartidos con el rival y con confirmación explícita para desvincular un partido de origen.
4. La corrección del ZIP escribía los sets pero no el estado del motor. Ahora inserta un evento `correccion` con el estado anterior y el nuevo; el siguiente punto continúa desde ese checkpoint. Se valida el formato y ganador. Si el resultado ya alimentó un encuentro iniciado, se impide cambiarlo.
5. Las acciones supervisadas incrementan `control_version`. Las colas offline de una versión anterior se conservan y requieren revisión; no se aplican silenciosamente. Las correcciones también cambian la revisión de eventos.
6. El panel ya no desmonta todas sus tarjetas en cada actualización y descarta respuestas antiguas. Añade consulta de respaldo cada 30 segundos.
7. El ZIP contiene archivos `.env` y el historial `.git`. No se leyeron ni importaron sus credenciales; excluirlos de futuros ZIP que se compartan. Si se publicaron fuera de un entorno de confianza, rotar las credenciales afectadas.

## Operación

- Reasignar: solo programados o en vivo. El juez anterior pierde autorización para anotar en ese partido.
- Cancelar: conserva foto, eventos, sets y estadísticas. Reactivar devuelve a programado si nunca comenzó; si comenzó, vuelve en vivo **pausado**, conservando el tiempo de pausa. El juez debe revisar y reanudar.
- Corregir: primero pausar desde la mesa si está en vivo. Abrir Marcador, configurar solo sets jugados, indicar motivo y sacador. Confirmar el reinicio del game/tiebreak parcial en **0-0**. Después de guardar, revisar y reanudar desde la mesa. Un resultado finalizado debe concordar con los sets y el formato; este formulario no implementa retiros/walkovers.
- Las correcciones no inventan aces, faltas ni puntos. La vista de estadísticas informa cuando hay correcciones y cuenta únicamente los puntos registrados. El detalle por set refleja el set registrado en cada evento original.
- Una corrección no se deshace con el botón del juez; se realiza otra corrección supervisada con un nuevo motivo.

## Despliegue

No requiere nuevas variables de entorno. El inicio normal ejecuta `ensureSchema`: amplía el ENUM de roles y eventos, añade `partidos.control_version` con valor cero y crea `auditoria_control_partido`. Es aditivo: no elimina usuarios, jugadores, partidos ni fotografías. La migración SQL 011 únicamente describe la ampliación del rol; usar el inicializador habitual para el esquema completo.

Después del despliegue, asignar «Juez Director» desde Administración → Usuarios y volver a iniciar sesión con esa cuenta. En jornadas activas, coordinar una pausa breve para desplegar y comprobar que los jueces no tengan acciones pendientes antes de intervenir partidos.

Pruebas locales: `npm test` en `scores-api`, `npm run build` en `scores-app`, y `scripts/qa-director.cjs` con Playwright y Vite en el puerto 4175. Las pruebas usan datos ficticios y no acceden a la base real. No sustituyen la comprobación posterior del despliegue y de los permisos de migración en Hostinger.
