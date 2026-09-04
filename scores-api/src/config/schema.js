const db = require('./db')

const columnExists = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )
  return Number(rows[0].total) > 0
}

const getColumn = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT DATA_TYPE AS dataType, IS_NULLABLE AS isNullable
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  )
  return rows[0] || null
}

const getColumnType = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT COLUMN_TYPE AS columnType
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  )
  return rows[0]?.columnType || null
}

const columnIndexExists = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )
  return Number(rows[0].total) > 0
}

const uniqueColumnIndexExists = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND NON_UNIQUE = 0`,
    [tableName, columnName]
  )
  return Number(rows[0].total) > 0
}

const columnForeignKeyExists = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName, columnName]
  )
  return Number(rows[0].total) > 0
}

const runOneTimeMatchCleanup = async () => {
  const migrationId = '2026-09-03-clear-all-matches'
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id         VARCHAR(100) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [applied] = await connection.query(
      'SELECT id FROM app_migrations WHERE id = ? FOR UPDATE',
      [migrationId]
    )
    if (applied.length) {
      await connection.commit()
      return null
    }

    const [[before]] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM partidos) AS partidos,
        (SELECT COUNT(*) FROM jugadores) AS jugadores,
        (SELECT COUNT(*) FROM users) AS usuarios
    `)

    // Favoritos no tiene una FK polimórfica; se limpia explícitamente.
    await connection.query("DELETE FROM favoritos WHERE tipo = 'partido'")
    // Sets, eventos y estado en vivo usan ON DELETE CASCADE.
    await connection.query('DELETE FROM partidos')

    const [[after]] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM partidos) AS partidos,
        (SELECT COUNT(*) FROM jugadores) AS jugadores,
        (SELECT COUNT(*) FROM users) AS usuarios
    `)
    if (
      Number(after.partidos) !== 0 ||
      Number(after.jugadores) !== Number(before.jugadores) ||
      Number(after.usuarios) !== Number(before.usuarios)
    ) {
      throw new Error('La limpieza de partidos no superó la verificación de integridad')
    }

    await connection.query('INSERT INTO app_migrations (id) VALUES (?)', [migrationId])
    await connection.commit()
    return {
      partidosEliminados: Number(before.partidos),
      jugadoresConservados: Number(after.jugadores),
      usuariosConservados: Number(after.usuarios),
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

exports.ensureSchema = async () => {
  const roleType = await getColumnType('users', 'rol')
  if (roleType && !roleType.includes("'juez'")) {
    await db.query(
      "ALTER TABLE users MODIFY rol ENUM('admin','juez','miembro') NOT NULL DEFAULT 'miembro'"
    )
  }

  if (!(await columnExists('users', 'avatar'))) {
    await db.query('ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL AFTER telefono')
  }
  if (!(await columnExists('jugadores', 'user_id'))) {
    await db.query('ALTER TABLE jugadores ADD COLUMN user_id INT NULL AFTER id')
  }
  if (!(await columnExists('jugadores', 'foto'))) {
    await db.query('ALTER TABLE jugadores ADD COLUMN foto VARCHAR(255) NULL AFTER deporte')
  }
  if (!(await columnForeignKeyExists('jugadores', 'user_id'))) {
    await db.query(
      `ALTER TABLE jugadores
       ADD CONSTRAINT fk_jugadores_user
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`
    )
  }
  if (!(await uniqueColumnIndexExists('jugadores', 'user_id'))) {
    const [duplicates] = await db.query(
      `SELECT user_id
       FROM jugadores
       WHERE user_id IS NOT NULL
       GROUP BY user_id
       HAVING COUNT(*) > 1
       LIMIT 1`
    )
    if (duplicates.length) {
      throw new Error('Hay cuentas vinculadas a más de un jugador; corrige los duplicados antes de continuar')
    }
    await db.query('ALTER TABLE jugadores ADD UNIQUE KEY uq_jugadores_user_id (user_id)')
  }

  const tournamentStart = await getColumn('torneos', 'fecha_inicio')
  const tournamentEnd = await getColumn('torneos', 'fecha_fin')
  if (tournamentStart?.isNullable === 'NO') {
    await db.query('ALTER TABLE torneos MODIFY fecha_inicio DATE NULL')
  }
  if (tournamentEnd?.isNullable === 'NO') {
    await db.query('ALTER TABLE torneos MODIFY fecha_fin DATE NULL')
  }

  if (!(await columnExists('partidos', 'hora_inicio'))) {
    await db.query('ALTER TABLE partidos ADD COLUMN hora_inicio TIME NULL AFTER fecha_inicio')
  }

  const matchStart = await getColumn('partidos', 'fecha_inicio')
  if (['timestamp', 'datetime'].includes(matchStart?.dataType)) {
    await db.query(
      `UPDATE partidos
       SET hora_inicio = TIME(fecha_inicio)
       WHERE fecha_inicio IS NOT NULL
         AND hora_inicio IS NULL`
    )
  }
  if (matchStart && (matchStart.dataType !== 'date' || matchStart.isNullable === 'NO')) {
    await db.query('ALTER TABLE partidos MODIFY fecha_inicio DATE NULL')
  }

  if (!(await columnExists('partidos', 'categoria_id'))) {
    await db.query('ALTER TABLE partidos ADD COLUMN categoria_id INT NULL AFTER deporte')
  }
  if (!(await columnExists('partidos', 'notas'))) {
    await db.query('ALTER TABLE partidos ADD COLUMN notas TEXT NULL AFTER fecha_inicio')
  }
  if (!(await columnExists('partidos', 'origen_partido1_id'))) {
    await db.query('ALTER TABLE partidos ADD COLUMN origen_partido1_id INT NULL AFTER equipo2_id')
  }
  if (!(await columnExists('partidos', 'origen_partido2_id'))) {
    await db.query(
      'ALTER TABLE partidos ADD COLUMN origen_partido2_id INT NULL AFTER origen_partido1_id'
    )
  }
  if (!(await columnExists('partidos', 'juez_id'))) {
    await db.query('ALTER TABLE partidos ADD COLUMN juez_id INT NULL AFTER origen_partido2_id')
  }
  if (!(await columnExists('partidos', 'cancha_id'))) {
    await db.query('ALTER TABLE partidos ADD COLUMN cancha_id INT NULL AFTER juez_id')
  }
  if (!(await columnExists('partidos', 'mejor_de_sets'))) {
    await db.query(
      'ALTER TABLE partidos ADD COLUMN mejor_de_sets TINYINT NOT NULL DEFAULT 3 AFTER cancha_id'
    )
  }
  if (!(await columnExists('partidos', 'juegos_por_set'))) {
    await db.query(
      'ALTER TABLE partidos ADD COLUMN juegos_por_set TINYINT NOT NULL DEFAULT 6 AFTER mejor_de_sets'
    )
  }
  if (!(await columnExists('partidos', 'diferencia_juegos'))) {
    await db.query(
      'ALTER TABLE partidos ADD COLUMN diferencia_juegos TINYINT NOT NULL DEFAULT 2 AFTER juegos_por_set'
    )
  }
  if (!(await columnExists('partidos', 'modo_game'))) {
    await db.query(
      "ALTER TABLE partidos ADD COLUMN modo_game ENUM('ventaja','sin_ventaja') NOT NULL DEFAULT 'ventaja' AFTER mejor_de_sets"
    )
  }
  if (!(await columnExists('partidos', 'set_decisivo'))) {
    await db.query(
      "ALTER TABLE partidos ADD COLUMN set_decisivo ENUM('set_completo','match_tiebreak') NOT NULL DEFAULT 'set_completo' AFTER modo_game"
    )
  }
  if (!(await columnExists('partidos', 'tiebreak_en'))) {
    await db.query(
      'ALTER TABLE partidos ADD COLUMN tiebreak_en TINYINT NOT NULL DEFAULT 6 AFTER set_decisivo'
    )
  }
  if (!(await columnExists('partidos', 'tiebreak_puntos'))) {
    await db.query(
      'ALTER TABLE partidos ADD COLUMN tiebreak_puntos TINYINT NOT NULL DEFAULT 7 AFTER tiebreak_en'
    )
  }
  if (!(await columnExists('partidos', 'match_tiebreak_puntos'))) {
    await db.query(
      'ALTER TABLE partidos ADD COLUMN match_tiebreak_puntos TINYINT NOT NULL DEFAULT 10 AFTER tiebreak_puntos'
    )
  }
  if (!(await columnExists('partidos', 'servidor_inicial'))) {
    await db.query(
      "ALTER TABLE partidos ADD COLUMN servidor_inicial ENUM('jugador1','jugador2') NOT NULL DEFAULT 'jugador1' AFTER match_tiebreak_puntos"
    )
  }

  const hasLegacyTournamentRelation = await columnExists('partidos', 'torneo_id')
  const hasLegacyTournamentCategory = await columnExists('torneos', 'categoria_id')
  const tournamentJoin =
    hasLegacyTournamentRelation && hasLegacyTournamentCategory
      ? 'LEFT JOIN torneos t ON t.id = p.torneo_id'
      : ''
  const tournamentCategory =
    hasLegacyTournamentRelation && hasLegacyTournamentCategory ? 't.categoria_id,' : ''

  await db.query(`
      UPDATE partidos p
      ${tournamentJoin}
      LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id
      LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
      LEFT JOIN equipos_padel e1 ON e1.id = p.equipo1_id
      LEFT JOIN equipos_padel e2 ON e2.id = p.equipo2_id
      SET p.categoria_id = COALESCE(
        p.categoria_id,
        ${tournamentCategory}
        j1.categoria_id,
        j2.categoria_id,
        e1.categoria_id,
        e2.categoria_id
      )
      WHERE p.categoria_id IS NULL
    `)

  if (!(await columnIndexExists('partidos', 'categoria_id'))) {
    await db.query('CREATE INDEX idx_partidos_categoria ON partidos (categoria_id)')
  }

  if (!(await columnForeignKeyExists('partidos', 'categoria_id'))) {
    await db.query(
      `ALTER TABLE partidos
       ADD CONSTRAINT fk_partidos_categoria
       FOREIGN KEY (categoria_id) REFERENCES categorias(id)`
    )
  }

  if (!(await columnIndexExists('partidos', 'origen_partido1_id'))) {
    await db.query('CREATE INDEX idx_partidos_origen1 ON partidos (origen_partido1_id)')
  }
  if (!(await columnIndexExists('partidos', 'origen_partido2_id'))) {
    await db.query('CREATE INDEX idx_partidos_origen2 ON partidos (origen_partido2_id)')
  }
  if (!(await columnForeignKeyExists('partidos', 'origen_partido1_id'))) {
    await db.query(
      `ALTER TABLE partidos
       ADD CONSTRAINT fk_partidos_origen1
       FOREIGN KEY (origen_partido1_id) REFERENCES partidos(id) ON DELETE SET NULL`
    )
  }
  if (!(await columnForeignKeyExists('partidos', 'origen_partido2_id'))) {
    await db.query(
      `ALTER TABLE partidos
       ADD CONSTRAINT fk_partidos_origen2
       FOREIGN KEY (origen_partido2_id) REFERENCES partidos(id) ON DELETE SET NULL`
    )
  }
  if (!(await columnIndexExists('partidos', 'juez_id'))) {
    await db.query('CREATE INDEX idx_partidos_juez ON partidos (juez_id)')
  }
  if (!(await columnForeignKeyExists('partidos', 'juez_id'))) {
    await db.query(
      `ALTER TABLE partidos
       ADD CONSTRAINT fk_partidos_juez
       FOREIGN KEY (juez_id) REFERENCES users(id) ON DELETE SET NULL`
    )
  }
  if (!(await columnIndexExists('partidos', 'cancha_id'))) {
    await db.query('CREATE INDEX idx_partidos_cancha ON partidos (cancha_id)')
  }
  if (!(await columnForeignKeyExists('partidos', 'cancha_id'))) {
    await db.query(
      `ALTER TABLE partidos
       ADD CONSTRAINT fk_partidos_cancha
       FOREIGN KEY (cancha_id) REFERENCES canchas(id) ON DELETE SET NULL`
    )
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS eventos_partido (
      id               BIGINT NOT NULL AUTO_INCREMENT,
      partido_id       INT NOT NULL,
      secuencia        INT NOT NULL,
      tipo             ENUM('punto','primera_falta','let') NOT NULL,
      ganador          ENUM('jugador1','jugador2') NULL,
      motivo           VARCHAR(40) NULL,
      servidor         ENUM('jugador1','jugador2') NOT NULL,
      numero_servicio  TINYINT NOT NULL DEFAULT 1,
      marcador_antes   JSON NOT NULL,
      marcador_despues JSON NOT NULL,
      created_by       INT NOT NULL,
      created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      anulado_at       TIMESTAMP NULL,
      anulado_por      INT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_evento_secuencia (partido_id, secuencia),
      KEY idx_eventos_partido_activos (partido_id, anulado_at, secuencia),
      KEY idx_eventos_created_by (created_by),
      CONSTRAINT fk_eventos_partido
        FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE,
      CONSTRAINT fk_eventos_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_eventos_anulado_por FOREIGN KEY (anulado_por) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const eventType = await getColumnType('eventos_partido', 'tipo')
  if (eventType && !eventType.includes("'cambio_servidor'")) {
    await db.query(
      "ALTER TABLE eventos_partido MODIFY tipo ENUM('punto','primera_falta','let','cambio_servidor') NOT NULL"
    )
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS estado_en_vivo_partido (
      partido_id       INT NOT NULL,
      iniciado_at      DATETIME NULL,
      pausado_at       DATETIME NULL,
      segundos_pausa   INT NOT NULL DEFAULT 0,
      finalizado_at    DATETIME NULL,
      updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (partido_id),
      CONSTRAINT fk_estado_en_vivo_partido
        FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const cleanup = await runOneTimeMatchCleanup()
  if (cleanup) {
    console.log(
      `🧹  Limpieza única completada: ${cleanup.partidosEliminados} partidos eliminados; ` +
      `${cleanup.jugadoresConservados} jugadores y ${cleanup.usuariosConservados} usuarios conservados`
    )
  }

  console.log('✅  Esquema de partidos y jueces actualizado')
}
