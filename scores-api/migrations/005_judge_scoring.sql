-- Rol de juez, formato configurable por partido y eventos punto a punto.
ALTER TABLE users
  MODIFY rol ENUM('admin','juez','miembro') NOT NULL DEFAULT 'miembro';

ALTER TABLE partidos
  ADD COLUMN juez_id INT NULL AFTER origen_partido2_id,
  ADD COLUMN mejor_de_sets TINYINT NOT NULL DEFAULT 3 AFTER juez_id,
  ADD COLUMN modo_game ENUM('ventaja','sin_ventaja') NOT NULL DEFAULT 'ventaja' AFTER mejor_de_sets,
  ADD COLUMN set_decisivo ENUM('set_completo','match_tiebreak') NOT NULL DEFAULT 'set_completo' AFTER modo_game,
  ADD COLUMN tiebreak_en TINYINT NOT NULL DEFAULT 6 AFTER set_decisivo,
  ADD COLUMN tiebreak_puntos TINYINT NOT NULL DEFAULT 7 AFTER tiebreak_en,
  ADD COLUMN match_tiebreak_puntos TINYINT NOT NULL DEFAULT 10 AFTER tiebreak_puntos,
  ADD COLUMN servidor_inicial ENUM('jugador1','jugador2') NOT NULL DEFAULT 'jugador1' AFTER match_tiebreak_puntos,
  ADD INDEX idx_partidos_juez (juez_id),
  ADD CONSTRAINT fk_partidos_juez FOREIGN KEY (juez_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE eventos_partido (
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
  CONSTRAINT fk_eventos_partido FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_eventos_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_eventos_anulado_por FOREIGN KEY (anulado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
