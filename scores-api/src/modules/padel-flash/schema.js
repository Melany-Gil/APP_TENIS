const columnIsNullable = async (db, table, column) => {
  const [rows] = await db.query(
    `SELECT IS_NULLABLE AS isNullable FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  )
  return rows[0]?.isNullable === 'YES'
}
const columnExists = async (db, table, column) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  return Number(rows[0].total) > 0
}
exports.ensurePadelSchema = async (db) => {
  const suffix = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  await db.query(`CREATE TABLE IF NOT EXISTS padel_events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL, fecha DATE NOT NULL,
    cancha1 VARCHAR(80) NOT NULL, cancha2 VARCHAR(80) NOT NULL,
    inicio SMALLINT NOT NULL DEFAULT 1080, pausa_inicio SMALLINT NULL,
    pausa_fin SMALLINT NULL, cierre SMALLINT NOT NULL DEFAULT 1320,
    publicado TINYINT NOT NULL DEFAULT 0,
    votacion VARCHAR(16) NOT NULL DEFAULT 'pendiente',
    desempate_pareja INT NULL, desempate_motivo VARCHAR(500) NULL,
    version INT NOT NULL DEFAULT 0, created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_padel_event (nombre,fecha)
  ) ${suffix}`)
  // La pausa es opcional: eventos creados antes de este cambio quedan con sus horas,
  // los nuevos pueden saltársela por completo.
  if (!(await columnIsNullable(db, 'padel_events', 'pausa_inicio')))
    await db.query('ALTER TABLE padel_events MODIFY pausa_inicio SMALLINT NULL')
  if (!(await columnIsNullable(db, 'padel_events', 'pausa_fin')))
    await db.query('ALTER TABLE padel_events MODIFY pausa_fin SMALLINT NULL')
  // Formato por grupos: todos contra todos dentro de cada grupo, con descanso
  // rotativo y las dos canchas compartidas entre grupos por turnos.
  if (!(await columnExists(db, 'padel_events', 'formato')))
    await db.query(
      "ALTER TABLE padel_events ADD COLUMN formato VARCHAR(16) NOT NULL DEFAULT 'individual'"
    )
  if (!(await columnExists(db, 'padel_events', 'duracion_partido')))
    await db.query(
      'ALTER TABLE padel_events ADD COLUMN duracion_partido SMALLINT NOT NULL DEFAULT 20'
    )
  if (!(await columnExists(db, 'padel_events', 'tamano_grupo')))
    await db.query('ALTER TABLE padel_events ADD COLUMN tamano_grupo SMALLINT NULL')
  await db.query(`CREATE TABLE IF NOT EXISTS padel_pairs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, event_id INT NOT NULL,
    numero INT NOT NULL, jugador1 VARCHAR(100) NOT NULL, jugador2 VARCHAR(100) NOT NULL,
    disfraz VARCHAR(100) NOT NULL DEFAULT '', foto_url VARCHAR(255) NULL,
    UNIQUE KEY uq_padel_pair_number (event_id,numero),
    CONSTRAINT fk_padel_pair_event FOREIGN KEY (event_id) REFERENCES padel_events(id)
  ) ${suffix}`)
  if (!(await columnExists(db, 'padel_pairs', 'grupo')))
    await db.query('ALTER TABLE padel_pairs ADD COLUMN grupo TINYINT NULL')
  if (!(await columnExists(db, 'padel_pairs', 'no_antes')))
    await db.query('ALTER TABLE padel_pairs ADD COLUMN no_antes SMALLINT NULL')
  await db.query(`CREATE TABLE IF NOT EXISTS padel_fixture (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, event_id INT NOT NULL,
    turno INT NOT NULL, cancha INT NOT NULL, minuto INT NOT NULL,
    pareja1 INT NOT NULL, pareja2 INT NOT NULL,
    inicio_real BIGINT NULL, s1a INT NULL, s1b INT NULL, s2a INT NULL, s2b INT NULL,
    motivo VARCHAR(20) NULL, version INT NOT NULL DEFAULT 0,
    updated_by INT NULL,
    UNIQUE KEY uq_padel_court_slot (event_id,turno,cancha),
    CONSTRAINT fk_padel_fixture_event FOREIGN KEY (event_id) REFERENCES padel_events(id),
    CONSTRAINT fk_padel_fixture_p1 FOREIGN KEY (pareja1) REFERENCES padel_pairs(id),
    CONSTRAINT fk_padel_fixture_p2 FOREIGN KEY (pareja2) REFERENCES padel_pairs(id)
  ) ${suffix}`)
  await db.query(`CREATE TABLE IF NOT EXISTS padel_votes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, event_id INT NOT NULL, pareja_id INT NOT NULL,
    browser_hash CHAR(64) NOT NULL, phone_hash CHAR(64) NOT NULL,
    datos_privados TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_padel_browser (event_id,browser_hash),
    UNIQUE KEY uq_padel_phone (event_id,phone_hash),
    CONSTRAINT fk_padel_vote_event FOREIGN KEY (event_id) REFERENCES padel_events(id),
    CONSTRAINT fk_padel_vote_pair FOREIGN KEY (pareja_id) REFERENCES padel_pairs(id)
  ) ${suffix}`)
  await db.query(`CREATE TABLE IF NOT EXISTS padel_audit (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, event_id INT NOT NULL, user_id INT NOT NULL,
    accion VARCHAR(40) NOT NULL, detalle JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_padel_audit (event_id,id),
    CONSTRAINT fk_padel_audit_event FOREIGN KEY (event_id) REFERENCES padel_events(id)
  ) ${suffix}`)
}
