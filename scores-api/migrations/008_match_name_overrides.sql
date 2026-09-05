-- Nombres manuales por partido: el juez puede renombrar a los participantes
-- en el marcador (invitado, nombre incorrecto, etc.) sin tocar el jugador.
-- La API aplica estos cambios de forma idempotente al iniciar (ensureSchema).
-- Este archivo queda como referencia para una ejecución manual única.

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'nombre_override') = 0,
  'ALTER TABLE partidos ADD COLUMN nombre_override VARCHAR(100) NULL AFTER notas',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'nombre_override_j1') = 0,
  'ALTER TABLE partidos ADD COLUMN nombre_override_j1 VARCHAR(100) NULL AFTER nombre_override',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'nombre_override_j2') = 0,
  'ALTER TABLE partidos ADD COLUMN nombre_override_j2 VARCHAR(100) NULL AFTER nombre_override_j1',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
