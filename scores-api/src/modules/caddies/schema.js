exports.ensureSchema = async (db) => {
  // Caddie is an additional role: the existing primary role is never replaced.
  await db.query(`CREATE TABLE IF NOT EXISTS caddie_roles (
    user_id INT PRIMARY KEY, activo BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`)
  await db.query(`CREATE TABLE IF NOT EXISTS caddie_asignaciones (
    partido_id INT PRIMARY KEY, caddie_id INT NULL, version INT NOT NULL DEFAULT 1,
    FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE,
    FOREIGN KEY (caddie_id) REFERENCES users(id)
  ) ENGINE=InnoDB`)
  await db.query(`CREATE TABLE IF NOT EXISTS caddie_auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY, partido_id INT NOT NULL, anterior_id INT NULL,
    nuevo_id INT NULL, actor_id INT NOT NULL, motivo VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  await db.query(`CREATE TABLE IF NOT EXISTS caddie_evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY, partido_id INT NOT NULL, caddie_id INT NOT NULL,
    autor_id INT NOT NULL, atencion TINYINT NOT NULL, colaboracion TINYINT NOT NULL,
    trato TINYINT NOT NULL, comentario VARCHAR(1000) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_caddie_respuesta (partido_id, autor_id),
    FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE,
    FOREIGN KEY (caddie_id) REFERENCES users(id),
    FOREIGN KEY (autor_id) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
}
