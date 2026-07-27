# Marcadores de Tenis · Club Unión

Aplicación web para el Subcomité de Tenis del Club Unión en Bucaramanga. Incluye acceso por documento y contraseña, recuperación por correo, roles de administrador y miembro, marcadores con tres sets, actualización automática y consulta del historial.

## Funcionalidad principal

- Inicio de sesión con número de documento.
- Primer administrador mediante la pantalla de configuración inicial.
- Creación de los demás miembros y del segundo administrador desde el panel.
- Recuperación de contraseña mediante OTP enviado por SMTP.
- Gestión de usuarios, jugadores, categorías, torneos, sedes, partidos y marcadores.
- Actualización de partidos en vivo cada 5 segundos.
- Historial filtrable por fecha, jugador y categoría.
- Marcador con tres sets fijos y posibilidad de agregar o quitar sets adicionales.
- Partidos encadenados: un participante puede ser el ganador de otro partido de la misma categoría.
- Estadísticas y ranking de jugadores calculados por categoría desde los partidos finalizados.

## Puntuación de la clasificación interna

El tenis no define un sistema universal de puntos para ligas internas. Para el Club Unión se
adopta esta regla:

- Victoria sin ceder sets: 3 puntos para el ganador y 0 para el perdedor.
- Victoria en la que el rival gana al menos un set: 2 puntos para el ganador y 1 para el perdedor.
- Los partidos cancelados, no finalizados o sin ganador no generan estadísticas.
- Las posiciones se calculan por categoría con todos los partidos finalizados registrados.
- Desempates: puntos, victorias, porcentaje de sets ganados y porcentaje de games ganados.

## Estructura

- `scores-app`: frontend React + Vite.
- `scores-api`: API Node.js + Express.
- `reset_db.sql`: instalación limpia de MySQL.
- `scores-api/migrations`: cambios para bases ya existentes.
- `Dockerfile`: empaqueta frontend y backend en un solo servicio.

## Desarrollo local

Requisitos: Node.js 22 y MySQL 8.

1. Ejecuta `reset_db.sql` en MySQL Workbench.
2. Copia `scores-api/.env.example` como `scores-api/.env` y completa los valores.
3. Copia `scores-app/.env.example` como `scores-app/.env`.
4. Instala y ejecuta:

```text
cd scores-api
npm install
npm run dev
```

En otra terminal:

```text
cd scores-app
npm install
npm run dev
```

Frontend: `http://localhost:5173`. API: `http://localhost:3001/api`.

## Base de datos existente

Si la base ya fue creada con el script anterior, ejecuta una sola vez:

```text
scores-api/migrations/001_security_and_search.sql
```

La migración amplía el hash de recuperación, añade índices de búsqueda y crea las categorías `5ta` y `Damas`.

## Despliegue gratuito recomendado

Para una primera versión de bajo tráfico:

1. Crea un MySQL gratuito en Aiven y carga `reset_db.sql`.
2. Sube este proyecto a GitHub.
3. En Koyeb, crea un Web Service desde el repositorio y selecciona construcción mediante `Dockerfile`.
4. Configura las variables de `scores-api/.env.example` en Koyeb.
5. Usa `PORT=8000`, `NODE_ENV=production`, `VITE_API_URL=/api`, `DB_SSL=true` y el host/puerto/usuario de Aiven.
6. Define `FRONTEND_URL` con la URL pública final de Koyeb.

El contenedor sirve la interfaz y la API bajo el mismo dominio, por lo que no hace falta desplegar dos proyectos. El plan gratuito es adecuado para un piloto; puede entrar en reposo y no ofrece alta disponibilidad.

## SMTP

Para Gmail usa una contraseña de aplicación, no la contraseña normal de la cuenta. Configura `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USER`, `MAIL_PASS` y `MAIL_FROM`.

Los códigos OTP se guardan como hash, vencen a los 15 minutos y quedan invalidados después de cambiar la contraseña.

## Verificación

```text
cd scores-api
npm test
npm audit

cd ../scores-app
npm run build
```

No guardes archivos `.env` ni credenciales en Git.
