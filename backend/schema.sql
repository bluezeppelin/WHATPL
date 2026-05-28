-- WHATPL MySQL Schema

CREATE DATABASE IF NOT EXISTS whatpl CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE whatpl;

CREATE TABLE IF NOT EXISTS users (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  login_id          VARCHAR(50)   NOT NULL UNIQUE,
  password_hash     VARCHAR(255)  NOT NULL,
  email             VARCHAR(255)  NOT NULL UNIQUE,
  name              VARCHAR(100),
  birth_date        VARCHAR(20),
  phone             VARCHAR(30),
  profile_image_url TEXT,
  favorite_genre    VARCHAR(100),
  artist_name       VARCHAR(100)  UNIQUE,
  role              ENUM('user','creator','admin') NOT NULL DEFAULT 'user',
  status            ENUM('active','inactive')      NOT NULL DEFAULT 'active',
  terms_agreed      TINYINT(1)    NOT NULL DEFAULT 0,
  privacy_agreed    TINYINT(1)    NOT NULL DEFAULT 0,
  agreed_at         DATETIME,
  deactivated_at    DATETIME,
  deactivated_by    VARCHAR(36),
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tracks (
  id                   VARCHAR(36)  NOT NULL PRIMARY KEY,
  title                VARCHAR(255) NOT NULL,
  artist               VARCHAR(255) NOT NULL DEFAULT '알 수 없는 아티스트',
  genre                VARCHAR(100),
  description          TEXT,
  audio_url            TEXT         NOT NULL,
  audio_key            VARCHAR(512) NOT NULL,
  cover_url            TEXT,
  cover_key            VARCHAR(512),
  duration             INT          NOT NULL DEFAULT 0,
  plays                INT          NOT NULL DEFAULT 0,
  likes                INT          NOT NULL DEFAULT 0,
  uploaded_by_user_id  VARCHAR(36),
  status               ENUM('active','deleted','suspended') NOT NULL DEFAULT 'active',
  deleted_at           DATETIME,
  deleted_by           VARCHAR(100),
  delete_reason        TEXT,
  suspended_at         DATETIME,
  suspended_by         VARCHAR(100),
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS playlists (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  is_default TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  playlist_id VARCHAR(36) NOT NULL,
  track_id    VARCHAR(36) NOT NULL,
  position    INT         NOT NULL DEFAULT 0,
  INDEX idx_playlist_tracks_playlist_position (playlist_id, position),
  INDEX idx_playlist_tracks_track (track_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS liked_tracks (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  track_id   VARCHAR(36) NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_like (user_id, track_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS followed_artists (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  artist_name VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_follow (user_id, artist_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  type       VARCHAR(100) NOT NULL,
  title      VARCHAR(255),
  message    TEXT,
  link       VARCHAR(512),
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recently_played (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  track_id   VARCHAR(36) NOT NULL,
  played_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS player_sessions (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL UNIQUE,
  track_id        VARCHAR(36),
  position_sec    FLOAT        NOT NULL DEFAULT 0,
  current_index   INT          NOT NULL DEFAULT -1,
  queue_type      VARCHAR(50)  DEFAULT 'allTracks',
  queue_source_id VARCHAR(36),
  repeat_mode     VARCHAR(20)  NOT NULL DEFAULT 'none',
  shuffle         TINYINT(1)   NOT NULL DEFAULT 0,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS player_queue (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  track_id   VARCHAR(36) NOT NULL,
  position   INT         NOT NULL DEFAULT 0,
  INDEX idx_player_queue_session_position (session_id, position),
  INDEX idx_player_queue_track (track_id),
  FOREIGN KEY (session_id) REFERENCES player_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS creator_requests (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  login_id    VARCHAR(50),
  name        VARCHAR(100),
  artist_name VARCHAR(100),
  message     TEXT,
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_at DATETIME,
  reviewed_by VARCHAR(100),
  reject_reason TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS track_delete_requests (
  id                VARCHAR(36)  NOT NULL PRIMARY KEY,
  track_id          VARCHAR(36)  NOT NULL,
  creator_user_id   VARCHAR(36)  NOT NULL,
  creator_login_id  VARCHAR(50),
  artist_name       VARCHAR(100),
  track_title       VARCHAR(255) NOT NULL,
  reason            TEXT,
  status            ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by       VARCHAR(100),
  reviewed_at       DATETIME,
  reject_reason     TEXT,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hard_delete_logs (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  track_id   VARCHAR(36),
  title      VARCHAR(255),
  artist     VARCHAR(255),
  deleted_by VARCHAR(100),
  reason     TEXT,
  deleted_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_settings (
  id                  INT          NOT NULL PRIMARY KEY DEFAULT 1,
  site_name           VARCHAR(100) NOT NULL DEFAULT 'WHATPL',
  logo_url            TEXT,
  hero_background_url TEXT,
  main_color          VARCHAR(20)  NOT NULL DEFAULT '#7c3aed',
  sub_color1          VARCHAR(20)  NOT NULL DEFAULT '#a78bfa',
  sub_color2          VARCHAR(20)  NOT NULL DEFAULT '#312e81',
  sub_color3          VARCHAR(20)  NOT NULL DEFAULT '#111827',
  updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO site_settings (id) VALUES (1);
