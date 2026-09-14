# Limpieza selectiva de producción

No usar `reset_db.sql`: no es una limpieza que conserve jugadores.

## Qué se borra

Todos los torneos, partidos, parejas, inscripciones, grupos, resultados, eventos y registros de fotos de partidos. También los favoritos hacia esos elementos y la caché `jugador_stats` derivada de los partidos. Los tickets se conservan sin su vínculo al partido eliminado. La auditoría de supervisión se archiva en `auditoria_eliminaciones`.

Se conservan completos jugadores, usuarios, categorías, sedes y canchas. No se borran fotos físicas del servidor ni fotos de perfil. Las fotos físicas de partidos quedarán sin asociación: su limpieza requiere otra operación sobre archivos, con respaldo.

## Procedimiento

1. Despliega primero esta versión y comprueba que el arranque creó `auditoria_eliminaciones`.
2. Detén temporalmente la aplicación y otros procesos que escriban datos. No ejecutar mientras un juez esté anotando.
3. Desde tu gestor de MySQL exporta la base **completa**, con estructura y datos, a un archivo SQL privado. Verifica que sea reciente y restaurable. Respalda también la carpeta persistente de fotografías. No subas esos respaldos a Git.
4. En un equipo con Node.js y las dependencias de `scores-api`, guarda la conexión de producción en un archivo privado fuera del repositorio (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME y configuración TLS del proveedor). No pegues secretos en el chat. No desactives la verificación TLS.
5. Desde `scores-api`, ejecuta solamente la vista previa:

```powershell
node scripts/clean-torneos-parejas-partidos.js --env-file "C:\privado\produccion.env"
```

6. Revisa host, base y cantidades. Si aparecen ceros o no corresponden a la web, detente. El comando siguiente borra realmente; sustituye BASE_REAL por el nombre mostrado y usa tu respaldo real:

```powershell
node scripts/clean-torneos-parejas-partidos.js --env-file "C:\privado\produccion.env" --expected-db "BASE_REAL" --backup-file "C:\privado\respaldo-completo.sql" --confirm
```

7. Debe indicar cero torneos, partidos, parejas e inscripciones, manteniendo jugadores/usuarios. El script compara además el contenido íntegro de jugadores y usuarios antes de confirmar; ante errores revierte la transacción. La existencia del archivo SQL no garantiza que sea restaurable: compruébalo antes.
8. Repite la vista previa, reinicia la app y verifica jugadores e ingreso. Para recuperar lo borrado después del commit se necesita restaurar el respaldo.

La eliminación desde Administración > Torneos tiene un alcance distinto: solo elimina el torneo elegido y sus hijos; **conserva también las parejas** porque son entidades independientes.
