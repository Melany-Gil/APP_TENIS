-- Migración 011: Incorporar rol juez_director a la tabla users
ALTER TABLE users
  MODIFY rol ENUM('admin', 'juez_director', 'juez', 'miembro') NOT NULL DEFAULT 'miembro';
