# Administración de usuarios y disponibilidad

En Administración → Usuarios se pueden crear cuentas, editar sus datos y alias,
cambiar roles, restablecer contraseñas, activar/desactivar y eliminar.
El filtro de estado permite encontrar también cuentas inactivas.

- Eliminar requiere escribir el nombre completo. Se bloquea si hay jugadores,
  partidos, acciones de marcador, auditoría, fotografías, torneos u otros registros
  históricos relacionados. La respuesta explica el motivo. Los favoritos y códigos
  de recuperación personales se eliminan con una cuenta sin historial.
- Desactivar conserva todos los registros y revoca las sesiones de esa cuenta.
  Reactivar no vuelve a validar sus tokens anteriores: debe iniciar sesión de nuevo.
- Un administrador no puede eliminarse, desactivarse o degradar su propio rol.
  Las operaciones bloquean los administradores activos dentro de una transacción
  para evitar cambios concurrentes que dejen la plataforma sin administrador.
- Restablecer una contraseña invalida sesiones y códigos de recuperación pendientes.
  Nunca se muestra la contraseña existente. Para la propia cuenta se usa Mi perfil.
- Estas acciones solo están disponibles para administradores, también en la API;
  un Juez Director no recibe acceso de administración de usuarios.

## Sesiones y despliegue

`useHealthCheck` ya no llama a logout. Los fallos de red/servidor generan un aviso
tras dos fallos, con reintentos espaciados y sin solicitudes simultáneas. Se evita
consultar con la pestaña oculta y se reintenta cuando vuelve la conexión.
Un error temporal de base de datos durante la verificación devuelve 503, no 401.
Los tokens realmente expirados, cuentas inactivas o sesiones revocadas siguen
siendo rechazados con 401.

Al iniciar el backend, `ensureSchema` añade `users.session_version` si no existe
(entero con valor inicial 0). No exige nuevas variables de entorno ni ejecuta
borrados. Los tokens anteriores sin este campo se consideran versión 0 y siguen
siendo válidos hasta su expiración o una revocación explícita. Se requiere el permiso
ALTER habitual de las migraciones de esta aplicación.

## Verificación local

- `npm test` desde `scores-api` (base de datos simulada).
- `npm run build` desde `scores-app`.
- `scripts/qa-users.cjs`: navegador con API simulada, servidor frontend en puerto
  4175; recibe como argumento la ruta de Playwright si no está instalado localmente.
  Comprueba móvil/escritorio, edición, contraseña, estado, eliminación bloqueada
  y conservación de sesión durante fallos de health. No usa la base de producción.
