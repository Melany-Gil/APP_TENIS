# Fotografía única por partido

Una sola imagen activa por partido, etiquetada como inicio o final. No se exige para iniciar, puntuar o finalizar. Reemplazar requiere confirmación y la versión anterior; una subida concurrente nunca pisa silenciosamente otra. El UUID de entrega evita duplicados tras una respuesta perdida.

## Hostinger (configuración manual antes de probar)

Añadir exclusivamente esta variable al backend:

```
MATCH_PHOTOS_DIR=/home/u320257431/domains/legal-branding.com/uploads/matches
```

No modificar UPLOAD_DIR ni mover los avatares existentes. No se usa Drive ni Google Cloud. La carpeta la crea la aplicación con permisos restringidos si su usuario tiene acceso al padre; no usar permisos 777. Si falta la variable o es relativa, subir devuelve 503 sin impedir la marcación. Metadatos de fotos se guardan en fotos_partido, creada aditivamente por ensureSchema; el contenido permanece en disco, fuera del despliegue. Respaldar archivos **y base de datos** para restaurar las asociaciones.

## Recuperar una foto que quedó pendiente tras el primer despliegue

No borrar datos del navegador ni descartar la pendiente. Configurar MATCH_PHOTOS_DIR en hPanel y redeployar. Abrir el mismo partido con el mismo usuario/dispositivo y pulsar **Reintentar ahora**. También se puede descargar una copia local desde el diálogo. La ruta autenticada GET /api/partidos/:id/foto/estado verifica configuración y acceso de escritura sin crear archivos y sin exponer la ruta. Los errores de configuración, permisos o capacidad ya no se describen como pérdida de internet. El servidor debe confirmar la misma versión antes de eliminar la copia pendiente de IndexedDB.

## Seguridad y operación

- Lectura pública coherente con los detalles de partidos públicos. El juez confirma que tiene autorización de publicación. No hay listado del directorio, rutas del sistema ni acceso a archivos arbitrarios.
- Solo juez asignado/admin puede cargar. Validación de rol actual, asignación antes de recibir y nuevamente dentro de transacción.
- Máximo 8 MB en servidor, 24 megapíxeles; JPEG/PNG/WebP realmente decodificados por Sharp, sin animaciones. EXIF/GPS eliminado al recodificar. Imagen de hasta 1600 px, miniatura 480 px.
- Hasta dos cargas simultáneas por proceso y ocho intentos/minuto por usuario. La conversión pesada precede al bloqueo transaccional del partido.
- Una foto confirmada se guarda en IndexedDB por usuario/partido antes de mostrarse como pendiente. Reintentos cada 10 s con el partido abierto, visible y conexión. Se da prioridad a los puntos pendientes antes de iniciar cargas; una carga ya iniciada puede compartir la conexión con nuevos puntos.
- No hay servicio de subida con el navegador cerrado ni garantía ante borrado/expulsión del almacenamiento del navegador. No borrar datos hasta ver confirmación del servidor. Pendientes de otro partido reintentan al volver a abrir ese partido. Un conflicto de versión/permiso bloquea la foto, no el marcador.
- Sustituciones retiran la foto anterior del almacenamiento activo; copias de seguridad y cachés (hasta 60 s en navegador) pueden conservarla. La operación no es un borrado de todos los respaldos.
- Si se elimina un partido, su asociación se elimina en cascada y su foto deja de servirse. Los archivos huérfanos se conservan para recuperación; requieren limpieza administrativa de retención, nunca borrado automático en arranque. Un corte en un COMMIT también puede dejar archivos huérfanos. No eliminar archivos sin comparar con la base de datos y respaldar.

## Verificación pendiente en hosting real

1. Guardar una foto de prueba con juez asignado, comprobar inicio/final y reemplazo; revisar permisos reales del directorio.
2. Verla en detalle general y pantalla, comprobar que no se exige iniciar sesión para foto publicada.
3. Reiniciar Node.js y redeployar; verificar que permanece y comprobar la copia de seguridad de archivos y una restauración de prueba junto con la base.
4. Probar pérdida de conexión con foto pendiente y continuación de puntos; recuperar conexión sin duplicados.

Las pruebas locales no certifican persistencia ni backups de Hostinger. No se ha aplicado configuración ni migración a producción desde este cambio.

Se añadió Sharp para decodificación real y se actualizó Multer a 2.3.0 por un aviso de seguridad del receptor multipart. La auditoría también detectó avisos en dependencias previas ajenas a fotografías (ip-address, mysql2, nodemailer y qs); requieren una revisión de mantenimiento aparte, no se ejecutó un arreglo masivo automático.
