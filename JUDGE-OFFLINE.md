# Mesa de juez: sincronización y despliegue

## Uso

- Abrir el partido con conexión antes de arbitrar. La mesa calcula el marcador local con el mismo motor de reglas que el servidor.
- Cada punto, primera falta y repetición de saque se guarda en una cola local antes de aparecer. Puede seguirse marcando con conexión lenta o sin conexión.
- «Marcador local · N pendientes» indica acciones aún no confirmadas. La pantalla pública únicamente muestra el resultado confirmado en el servidor.
- La cola se envía en orden, al recuperar internet y mediante reintentos periódicos. Se conserva por cuenta en el almacenamiento del navegador, incluso tras recargar. No usar navegación privada ni borrar datos del navegador durante un partido.
- La aplicación necesita una conexión inicial para cargar. Esta entrega no incluye una PWA ni garantiza abrir la aplicación desde cero estando offline. Los pendientes se recuperan al poder cargar de nuevo la app.
- Solo una pestaña por cuenta controla la cola (Web Locks, navegador moderno y HTTPS). Una pestaña secundaria espera a que se cierre la primera; no escribe sobre su cola.
- «Deshacer local» retira la última acción que nunca se ha enviado. Si una acción ya se intentó enviar, se confirma primero y después se deshace en el servidor. No se borra silenciosamente una acción posiblemente aplicada.
- Pausar, cambiar el sacador, editar nombres y cambiar de partido requieren conexión y la cola vacía. El cronómetro no se congela por un corte de red.
- Las estadísticas de motivos dependen de que el juez active el detalle. Para un porcentaje de primer saque fiable también debe registrar las primeras faltas.

## Conflictos

Cada acción tiene un UUID, la revisión anterior del marcador y la configuración del partido. El servidor valida la asignación del juez, bloquea el partido durante la escritura y reconoce reintentos incluso si se perdió la respuesta o la acción se deshizo después.

Si otra persona cambia el marcador, el formato o los participantes, se detiene la cola; nunca se sobrescribe el resultado automáticamente. El juez puede sincronizar para ver el marcador confirmado y revisar la lista de pendientes antes de descartarla con confirmación explícita. Debe conservar una copia de esa lista y volver a registrar solo las acciones que falten.

## Despliegue

- Publicar frontend y backend juntos. El cliente necesita `revision`, `configuration` y el reconocimiento de `client_action_id`.
- `ensureSchema` añade una columna nullable y un índice único a `eventos_partido` (migración 010). No se ejecutó esta migración contra una base real durante el desarrollo.
- Se retiró la antigua limpieza automática de partidos del arranque; actualizar la estructura no debe borrar datos existentes.
- El frontend genera una copia ESM del motor canónico en `predev` y `prebuild`. No editar `src/generated/scoreEngine.js` manualmente.
- Antes de un torneo, probar desde dos dispositivos, conexión lenta, modo avión y recarga. No retirar una versión del servidor mientras tenga jueces con acciones pendientes.

## Verificación local

- `npm test`: incluye reglas, asignaciones, UUID, conflictos, persistencia y orden de sincronización.
- `npm --prefix scores-app run build`.
- Con Vite en 127.0.0.1:4173: `node scripts/qa-judge.cjs <ruta-al-modulo-playwright>` intercepta las APIs con datos simulados, sin base de datos real.

La compresión excluye SSE para no retrasar los marcadores públicos. Solo los bundles con hash tienen caché inmutable; los logos se revalidan.

La auditoría de dependencias de producción detectó tres alertas en paquetes que ya estaban en el lockfile (`ip-address`, `mysql2`, `qs`). No se aplicaron actualizaciones ajenas a esta integración; conviene actualizarlos con sus pruebas antes del siguiente despliegue de mantenimiento.
