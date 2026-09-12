# Soporte y notificaciones internas

Esta entrega añade tickets para jueces, jueces directores y administradores. Los jueces consultan únicamente sus solicitudes; administración puede ver las últimas 100 de todos y responder cambiando el estado. Los textos no admiten HTML ejecutable ni archivos adjuntos.

El servidor crea las tablas `tickets_soporte`, `ticket_respuestas` y `notificaciones` mediante la migración existente al arrancar. No borra partidos, usuarios ni otros datos. Se requiere el permiso de creación de tablas que ya utiliza la aplicación. Los tickets y la campana interna no necesitan variables nuevas; push sí requiere las claves descritas abajo.

Cada creación tiene un identificador de reintento; las respuestas requieren la versión vigente. Ticket y aviso se guardan en la misma transacción. Los avisos pertenecen a usuarios concretos y solo su destinatario puede marcarlos como leídos. La campana consulta cada minuto únicamente con la página visible y con conexión, y al abrirse. No agrega consultas a cada punto ni cierra sesiones por una caída temporal de red.

Las solicitudes y respuestas conservan autoría: una cuenta con ese historial debe desactivarse, no eliminarse. Las notificaciones personales por sí solas no impiden borrar una cuenta.

## Alcance de esta etapa

- Incluido: solicitudes, historial, respuesta y estado, campana interna para avisos de soporte.
- Incluido: push opcional por dispositivo para avisos de soporte, sujeto a configuración del servidor y permiso del navegador.
- Pendiente: recordatorios de partidos y avisos automáticos de asignación/inicio/finalización.
- El envío requiere conexión. Si falla, el formulario conserva el texto mientras siga abierto y permite reintentar; no es una cola persistente sin conexión.
- La prioridad urgente no sustituye contactar directamente al director del torneo.

## Activar push en Hostinger

1. En una terminal local, dentro de `scores-api`, ejecuta `npm run push:keys` después de instalar dependencias. Genera las claves una sola vez y guárdalas de forma segura. No ejecutes el comando en los logs del hosting ni compartas la clave privada en chats.
2. Copia las tres variables que imprime en **Environment variables** de Hostinger: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. La última puede ser `https://legal-branding.com`. Ninguna debe usar el prefijo `VITE_`; únicamente la clave pública se entrega al navegador mediante un endpoint autenticado.
3. Despliega el código y reinicia la aplicación. La migración añade `push_suscripciones` y `push_entregas`. Sin claves válidas, el sitio y la campana interna siguen funcionando; push permanece desactivado.
4. Inicia sesión como juez/director/admin, abre la campana y pulsa **Activar push**. Acepta el permiso. En iPhone/iPad (16.4 o posterior), primero añade la web a la pantalla de inicio y ábrela desde allí. Se requiere HTTPS, salvo desarrollo en localhost.
5. Para probar: activa un dispositivo de administrador, crea un ticket desde otra cuenta de juez con push activo, verifica el aviso del administrador, responde y verifica el aviso del juez. Hazlo también con la página cerrada. Este ensayo real requiere el despliegue y los permisos; las pruebas locales simulan los proveedores.

### Seguridad y operación

- Máximo cinco suscripciones por cuenta, alta/baja autenticada, sin transferir silenciosamente un dispositivo a otro usuario. URLs limitadas a proveedores Google, Mozilla, Apple y Windows; no se permite enviar a URLs arbitrarias. Las claves de suscripción son sensibles: proteger las copias de seguridad de la base de datos.
- La cola se crea junto con el ticket en la misma transacción; el envío ocurre aparte, en lotes de diez, con timeout de ocho segundos, bloqueo por entrega y hasta cuatro intentos espaciados. Usa etiquetas para agrupar reenvíos: la entrega es al menos una vez, no una garantía de entrega exactamente una vez.
- La cola se revisa cada 15 segundos mientras el proceso Node esté activo. Un proceso suspendido por el hosting no puede ejecutar la cola hasta despertar. No es un sistema de emergencia ni garantiza entrega inmediata. Reintenta pendientes recientes después de un reinicio; no envía trabajos de más de un día.
- Suscripciones vencidas/revocadas no se usan; los errores 404/410 del proveedor eliminan la suscripción. El cierre normal de sesión anula la suscripción local incluso si falla la red. Las suscripciones vencen con la sesión que las activó: tras un nuevo ingreso usa **Renovar activación** si hace falta. Cambiar claves VAPID requiere reactivar dispositivos.
- El push no contiene nombres, texto del ticket ni enlaces externos; al pulsarlo abre el inicio seguro y se consulta la campana. El service worker no almacena páginas ni intercepta solicitudes del marcador.
- Se limpian trabajos de más de siete días. Sin configuración VAPID el trabajador no arranca. No se modifican los partidos, fotos ni puntos.

Referencias: [Web Push (biblioteca oficial)](https://github.com/web-push-libs/web-push), [permiso y suscripción](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe), [requisitos de iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
