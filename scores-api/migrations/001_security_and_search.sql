-- Ejecutar una sola vez en instalaciones existentes.
ALTER TABLE password_resets
  MODIFY otp_code CHAR(64) NOT NULL;

CREATE INDEX idx_partidos_estado_fecha
  ON partidos (estado, fecha_inicio);

CREATE INDEX idx_partidos_jugador1
  ON partidos (jugador1_id);

CREATE INDEX idx_partidos_jugador2
  ON partidos (jugador2_id);

UPDATE categorias SET nombre = '2da', orden = 1
WHERE deporte = 'tenis' AND nombre = 'Categoria A';

UPDATE categorias SET nombre = '3ra', orden = 2
WHERE deporte = 'tenis' AND nombre = 'Categoria B';

UPDATE categorias SET nombre = '4ta', orden = 3
WHERE deporte = 'tenis' AND nombre = 'Categoria C';

INSERT INTO categorias (nombre, deporte, orden)
SELECT '5ta', 'tenis', 4
WHERE NOT EXISTS (
  SELECT 1 FROM categorias WHERE deporte = 'tenis' AND nombre = '5ta'
);

INSERT INTO categorias (nombre, deporte, orden)
SELECT 'Damas', 'tenis', 5
WHERE NOT EXISTS (
  SELECT 1 FROM categorias WHERE deporte = 'tenis' AND nombre = 'Damas'
);
