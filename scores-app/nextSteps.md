# Siguientes mejoras

El MVP ya cubre autenticación, recuperación por correo, roles, gestión de usuarios, jugadores y partidos, actualización automática de marcadores e historial con filtros.

Mejoras recomendadas para una segunda fase:

1. WebSockets o Server-Sent Events si se necesita latencia menor a los 5 segundos actuales.
2. Auditoría de cambios de marcador: administrador, fecha, valor anterior y valor nuevo.
3. Copias externas programadas de MySQL y procedimiento probado de restauración.
4. Almacenamiento de fotos en un servicio de objetos; no usar el disco efímero del servidor.
5. Pruebas de integración contra una base MySQL temporal.
6. Accesibilidad y pruebas visuales completas en móvil, tableta y escritorio.
7. Dominio oficial y remitente SMTP del Club Unión.
