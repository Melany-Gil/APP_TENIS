-- Ejecutar una sola vez en instalaciones existentes.
-- La categoría pasa del torneo/jugador al partido.

ALTER TABLE partidos
  ADD COLUMN categoria_id INT NULL AFTER deporte;

UPDATE partidos p
LEFT JOIN torneos t ON t.id = p.torneo_id
LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id
LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
LEFT JOIN equipos_padel e1 ON e1.id = p.equipo1_id
LEFT JOIN equipos_padel e2 ON e2.id = p.equipo2_id
SET p.categoria_id = COALESCE(
  t.categoria_id,
  j1.categoria_id,
  j2.categoria_id,
  e1.categoria_id,
  e2.categoria_id
)
WHERE p.categoria_id IS NULL;

ALTER TABLE partidos
  ADD KEY idx_partidos_categoria (categoria_id),
  ADD CONSTRAINT fk_partidos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id);
