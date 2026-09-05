-- Alias de acceso para jueces: pueden iniciar sesión con su documento
-- o con este "usuario". El login por alias solo aplica a cuentas rol = 'juez'.
-- La API aplica estos cambios de forma idempotente al iniciar (ensureSchema).
-- Este archivo queda como referencia para una ejecución manual única.

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'usuario') = 0,
  'ALTER TABLE users ADD COLUMN usuario VARCHAR(50) NULL AFTER numero_documento',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
     AND COLUMN_NAME = 'usuario' AND NON_UNIQUE = 0) = 0,
  'ALTER TABLE users ADD UNIQUE KEY uq_users_usuario (usuario)',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
