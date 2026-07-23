-- =====================================================
--  ScoreApp — Reset completo de la base de datos
--  Ejecutar en MySQL Workbench
-- =====================================================

DROP DATABASE IF EXISTS scoresapp;

CREATE DATABASE scoresapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE scoresapp;

-- ─────────────────────────────────────────────────────
-- users
-- El primer usuario en registrarse será admin
-- (controlado desde el backend)
-- ─────────────────────────────────────────────────────
CREATE TABLE users (
  id                INT          NOT NULL AUTO_INCREMENT,
  numero_documento  VARCHAR(20)  NOT NULL,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  email             VARCHAR(150) NOT NULL,
  password          VARCHAR(255) NOT NULL,
  rol               ENUM('admin','miembro') NOT NULL DEFAULT 'miembro',
  telefono          VARCHAR(20)      NULL,
  avatar            VARCHAR(255)     NULL,
  activo            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doc   (numero_documento),
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- password_resets
-- ─────────────────────────────────────────────────────
CREATE TABLE password_resets (
  id          INT        NOT NULL AUTO_INCREMENT,
  user_id     INT        NOT NULL,
  otp_code    CHAR(64)   NOT NULL,
  expires_at  TIMESTAMP  NOT NULL,
  used        BOOLEAN    NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- countries
-- ─────────────────────────────────────────────────────
CREATE TABLE countries (
  id    INT          NOT NULL AUTO_INCREMENT,
  code  VARCHAR(3)   NOT NULL,
  name  VARCHAR(100) NOT NULL,
  flag  VARCHAR(10)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- sedes
-- ─────────────────────────────────────────────────────
CREATE TABLE sedes (
  id        INT          NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(100) NOT NULL,
  direccion VARCHAR(200)     NULL,
  ciudad    VARCHAR(100) NOT NULL DEFAULT 'Bucaramanga',
  activa    BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- canchas
-- ─────────────────────────────────────────────────────
CREATE TABLE canchas (
  id         INT         NOT NULL AUTO_INCREMENT,
  sede_id    INT         NOT NULL,
  nombre     VARCHAR(50) NOT NULL,
  deporte    ENUM('tenis','padel','ambos') NOT NULL DEFAULT 'ambos',
  superficie ENUM('Cemento','Arcilla','Cesped Artificial','Madera','Sintetico') NOT NULL DEFAULT 'Cemento',
  activa     BOOLEAN     NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  FOREIGN KEY (sede_id) REFERENCES sedes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- categorias
-- ─────────────────────────────────────────────────────
CREATE TABLE categorias (
  id      INT         NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(50) NOT NULL,
  deporte ENUM('tenis','padel','ambos') NOT NULL DEFAULT 'ambos',
  orden   TINYINT     NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- jugadores
-- ─────────────────────────────────────────────────────
CREATE TABLE jugadores (
  id           INT          NOT NULL AUTO_INCREMENT,
  user_id      INT              NULL,
  country_id   INT          NOT NULL,
  nombre       VARCHAR(100) NOT NULL,
  apellido     VARCHAR(100) NOT NULL,
  apodo        VARCHAR(50)      NULL,
  fecha_nac    DATE             NULL,
  telefono     VARCHAR(20)      NULL,
  altura_cm    SMALLINT         NULL,
  peso_kg      TINYINT          NULL,
  mano         ENUM('Diestro','Zurdo','Ambidiestro') NOT NULL DEFAULT 'Diestro',
  deporte      ENUM('tenis','padel','ambos')         NOT NULL DEFAULT 'ambos',
  categoria_id INT              NULL,
  foto         VARCHAR(255)     NULL,
  activo       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)      REFERENCES users(id),
  FOREIGN KEY (country_id)   REFERENCES countries(id),
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- jugador_stats
-- ─────────────────────────────────────────────────────
CREATE TABLE jugador_stats (
  id         INT      NOT NULL AUTO_INCREMENT,
  jugador_id INT      NOT NULL,
  temporada  YEAR     NOT NULL,
  victorias  SMALLINT NOT NULL DEFAULT 0,
  derrotas   SMALLINT NOT NULL DEFAULT 0,
  puntos     INT      NOT NULL DEFAULT 0,
  ranking    SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stats (jugador_id, temporada),
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- equipos_padel
-- ─────────────────────────────────────────────────────
CREATE TABLE equipos_padel (
  id           INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100) NOT NULL,
  jugador1_id  INT          NOT NULL,
  jugador2_id  INT          NOT NULL,
  categoria_id INT              NULL,
  activo       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (jugador1_id)  REFERENCES jugadores(id),
  FOREIGN KEY (jugador2_id)  REFERENCES jugadores(id),
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- torneos
-- ─────────────────────────────────────────────────────
CREATE TABLE torneos (
  id           INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(150) NOT NULL,
  deporte      ENUM('tenis','padel','ambos') NOT NULL,
  fecha_inicio DATE         NOT NULL,
  fecha_fin    DATE         NOT NULL,
  estado       ENUM('proximo','en_curso','finalizado','cancelado') NOT NULL DEFAULT 'proximo',
  created_by   INT              NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by)   REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- inscripciones
-- ─────────────────────────────────────────────────────
CREATE TABLE inscripciones (
  id          INT  NOT NULL AUTO_INCREMENT,
  torneo_id   INT  NOT NULL,
  jugador_id  INT      NULL,
  equipo_id   INT      NULL,
  estado      ENUM('pendiente','confirmado','eliminado') NOT NULL DEFAULT 'pendiente',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (torneo_id)  REFERENCES torneos(id) ON DELETE CASCADE,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id),
  FOREIGN KEY (equipo_id)  REFERENCES equipos_padel(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- partidos
-- ─────────────────────────────────────────────────────
CREATE TABLE partidos (
  id           INT     NOT NULL AUTO_INCREMENT,
  deporte      ENUM('tenis','padel') NOT NULL,
  categoria_id INT         NOT NULL,
  jugador1_id  INT         NULL,
  jugador2_id  INT         NULL,
  equipo1_id   INT         NULL,
  equipo2_id   INT         NULL,
  estado       ENUM('programado','en_vivo','finalizado','cancelado') NOT NULL DEFAULT 'programado',
  ganador      ENUM('jugador1','jugador2') NULL,
  fecha_inicio TIMESTAMP   NOT NULL,
  notas        TEXT            NULL,
  created_by   INT         NULL,
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_partidos_estado_fecha (estado, fecha_inicio),
  KEY idx_partidos_jugador1 (jugador1_id),
  KEY idx_partidos_jugador2 (jugador2_id),
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  FOREIGN KEY (jugador1_id) REFERENCES jugadores(id),
  FOREIGN KEY (jugador2_id) REFERENCES jugadores(id),
  FOREIGN KEY (equipo1_id)  REFERENCES equipos_padel(id),
  FOREIGN KEY (equipo2_id)  REFERENCES equipos_padel(id),
  FOREIGN KEY (created_by)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- sets_partido
-- ─────────────────────────────────────────────────────
CREATE TABLE sets_partido (
  id          INT     NOT NULL AUTO_INCREMENT,
  partido_id  INT     NOT NULL,
  numero_set  TINYINT NOT NULL,
  games_j1    TINYINT NOT NULL DEFAULT 0,
  games_j2    TINYINT NOT NULL DEFAULT 0,
  tiebreak_j1 TINYINT     NULL,
  tiebreak_j2 TINYINT     NULL,
  completado  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_set (partido_id, numero_set),
  FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- anuncios
-- ─────────────────────────────────────────────────────
CREATE TABLE anuncios (
  id          INT          NOT NULL AUTO_INCREMENT,
  titulo      VARCHAR(255) NOT NULL,
  contenido   TEXT         NOT NULL,
  tipo        ENUM('noticia','evento','resultado','aviso') NOT NULL DEFAULT 'noticia',
  publicado   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by  INT              NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────
-- favoritos
-- ─────────────────────────────────────────────────────
CREATE TABLE favoritos (
  id            INT  NOT NULL AUTO_INCREMENT,
  user_id       INT  NOT NULL,
  tipo          ENUM('jugador','equipo','partido','torneo') NOT NULL,
  referencia_id INT  NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fav (user_id, tipo, referencia_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
--  DATOS BASE (sin usuarios — el primero en registrarse
--  será admin automáticamente desde el backend)
-- =====================================================

-- Países
INSERT INTO countries (code, name, flag) VALUES
  ('COL', 'Colombia',  '🇨🇴'),
  ('VEN', 'Venezuela', '🇻🇪'),
  ('ESP', 'España',    '🇪🇸'),
  ('ARG', 'Argentina', '🇦🇷'),
  ('USA', 'Estados Unidos', '🇺🇸');

-- Sedes
INSERT INTO sedes (nombre, direccion, ciudad) VALUES
  ('Club Union', NULL, 'Bucaramanga');

-- Canchas — 4 de tenis (arcilla) + 4 de pádel (césped sintético)
INSERT INTO canchas (sede_id, nombre, deporte, superficie) VALUES
  (1, 'Cancha de Tenis 1', 'tenis', 'Arcilla'),
  (1, 'Cancha de Tenis 2', 'tenis', 'Arcilla'),
  (1, 'Cancha de Tenis 3', 'tenis', 'Arcilla'),
  (1, 'Cancha de Tenis 4', 'tenis', 'Arcilla'),
  (1, 'Cancha de Padel 1', 'padel', 'Cesped Artificial'),
  (1, 'Cancha de Padel 2', 'padel', 'Cesped Artificial'),
  (1, 'Cancha de Padel 3', 'padel', 'Cesped Artificial'),
  (1, 'Cancha de Padel 4', 'padel', 'Cesped Artificial');

-- Categorías
INSERT INTO categorias (nombre, deporte, orden) VALUES
  ('2da',          'tenis',  1),
  ('3ra',          'tenis',  2),
  ('4ta',          'tenis',  3),
  ('5ta',          'tenis',  4),
  ('Damas',        'tenis',  5),
  ('Avanzado',     'padel',  1),
  ('Intermedio',   'padel',  2),
  ('Principiante', 'padel',  3),
  ('Libre',        'ambos',  6);
