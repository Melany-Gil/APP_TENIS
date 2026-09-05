# Despliegue conjunto en Hostinger

Configuración: Express, rama main, Node 22.x, raíz del repositorio (`.` o `/`,
según el selector), npm, entry file `server.js`. No seleccionar `scores-api`.

La instalación raíz ejecuta postinstall: instala ambas aplicaciones con sus
lockfiles y compila Vite con VITE_API_URL=/api. Express sirve scores-app/dist y
la API en el mismo dominio. Si el proveedor desactiva lifecycle scripts, ejecutar
`npm run build` antes del arranque; no desplegar sin interfaz compilada.

Importar las variables privadas desde Render. Ajustar NODE_ENV=production,
PORT=3000 y FRONTEND_URL=https://legal-branding.com,https://www.legal-branding.com.
Conservar Aiven, TLS, secretos y correo. Nunca versionar el .env.

UPLOAD_DIR requiere una ruta absoluta escribible cuya persistencia confirme
Hostinger fuera de los directorios reemplazados al desplegar. No usar /var/data
de Render ni asumir que uploads sobrevive. Verificar subiendo una foto y
reiniciando y redesplegando. Hasta entonces la persistencia NO está validada.

Validación antes del cambio público: página inicial y rutas internas, /api/health,
login, acceso del juez, puntos SSE desde dos navegadores, reconexión SSE, fotos,
correo y Aiven. SSE usa clientes en memoria: un único proceso backend, o adaptar
pub/sub antes de escalar a varios procesos. Confirmar buffering/timeouts con soporte.

No ejecutar limpiezas de base de datos. El arranque existente ejecuta ensureSchema:
respaldar Aiven antes del primer inicio. Mantener Render disponible hasta aprobar
las pruebas. Esta adaptación no cambia Dockerfile ni el despliegue de Render.
