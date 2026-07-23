-- Fechas opcionales para torneos y fecha/hora independientes para partidos.
-- La API aplica estos cambios de forma idempotente al iniciar.
-- Este archivo queda como referencia para una ejecución manual única.

ALTER TABLE torneos
  MODIFY fecha_inicio DATE NULL,
  MODIFY fecha_fin DATE NULL;

ALTER TABLE partidos
  ADD COLUMN hora_inicio TIME NULL AFTER fecha_inicio;

UPDATE partidos
SET hora_inicio = TIME(fecha_inicio)
WHERE fecha_inicio IS NOT NULL
  AND hora_inicio IS NULL;

ALTER TABLE partidos
  MODIFY fecha_inicio DATE NULL;
