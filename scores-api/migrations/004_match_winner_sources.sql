ALTER TABLE partidos
  ADD COLUMN origen_partido1_id INT NULL AFTER equipo2_id,
  ADD COLUMN origen_partido2_id INT NULL AFTER origen_partido1_id,
  ADD INDEX idx_partidos_origen1 (origen_partido1_id),
  ADD INDEX idx_partidos_origen2 (origen_partido2_id),
  ADD CONSTRAINT fk_partidos_origen1
    FOREIGN KEY (origen_partido1_id) REFERENCES partidos(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_partidos_origen2
    FOREIGN KEY (origen_partido2_id) REFERENCES partidos(id) ON DELETE SET NULL;
