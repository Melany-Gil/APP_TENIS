-- Relación uno-a-uno entre una cuenta y un jugador, más fotografías públicas.
-- Es idempotente para instalaciones creadas con reset_db.sql o actualizadas en producción.

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar') = 0,
  'ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL AFTER telefono',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jugadores' AND COLUMN_NAME = 'user_id') = 0,
  'ALTER TABLE jugadores ADD COLUMN user_id INT NULL AFTER id',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jugadores' AND COLUMN_NAME = 'foto') = 0,
  'ALTER TABLE jugadores ADD COLUMN foto VARCHAR(255) NULL AFTER deporte',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
   WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'jugadores'
     AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME = 'users') = 0,
  'ALTER TABLE jugadores ADD CONSTRAINT fk_jugadores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jugadores'
     AND COLUMN_NAME = 'user_id' AND NON_UNIQUE = 0) = 0,
  'ALTER TABLE jugadores ADD UNIQUE KEY uq_jugadores_user_id (user_id)',
  'SELECT 1'
);
PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
