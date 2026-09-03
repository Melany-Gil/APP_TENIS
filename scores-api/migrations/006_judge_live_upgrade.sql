-- Evolución del control de jueces: cancha, reglas configurables, cronómetro y saque manual.
-- El despliegue aplica estas mismas comprobaciones de forma idempotente desde src/config/schema.js.

ALTER TABLE partidos
  ADD COLUMN cancha_id INT NULL AFTER juez_id,
  ADD COLUMN juegos_por_set TINYINT NOT NULL DEFAULT 6 AFTER mejor_de_sets,
  ADD COLUMN diferencia_juegos TINYINT NOT NULL DEFAULT 2 AFTER juegos_por_set;

CREATE INDEX idx_partidos_cancha ON partidos (cancha_id);
ALTER TABLE partidos
  ADD CONSTRAINT fk_partidos_cancha
  FOREIGN KEY (cancha_id) REFERENCES canchas(id) ON DELETE SET NULL;

ALTER TABLE eventos_partido
  MODIFY tipo ENUM('punto','primera_falta','let','cambio_servidor') NOT NULL;

CREATE TABLE estado_en_vivo_partido (
  partido_id      INT NOT NULL,
  iniciado_at     DATETIME NULL,
  pausado_at      DATETIME NULL,
  segundos_pausa  INT NOT NULL DEFAULT 0,
  finalizado_at   DATETIME NULL,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (partido_id),
  CONSTRAINT fk_estado_en_vivo_partido
    FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
