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

exports.ensureSchema = async () => {
  if (!(await columnExists('partidos', 'categoria_id'))) {
    await db.query('ALTER TABLE partidos ADD COLUMN categoria_id INT NULL AFTER deporte')
  }
  if (!(await columnExists('partidos', 'notas'))) {
    await db.query('ALTER TABLE partidos ADD COLUMN notas TEXT NULL AFTER fecha_inicio')
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

  console.log('✅  Esquema de partidos actualizado')
}
