-- WHATPL SQL transition fixes
-- Use this only if an existing RDS DB was created before playlist_tracks/player_queue had row ids.
-- For a fresh DB, running backend/schema.sql is enough.

USE whatpl;

-- playlist_tracks needs a row id so duplicate track_id entries can be added and removed one-by-one.
ALTER TABLE playlist_tracks ADD COLUMN id VARCHAR(36) NULL FIRST;
UPDATE playlist_tracks SET id = UUID() WHERE id IS NULL;
ALTER TABLE playlist_tracks MODIFY id VARCHAR(36) NOT NULL;
ALTER TABLE playlist_tracks ADD PRIMARY KEY (id);
CREATE INDEX idx_playlist_tracks_playlist_position ON playlist_tracks (playlist_id, position);
CREATE INDEX idx_playlist_tracks_track ON playlist_tracks (track_id);
ALTER TABLE playlist_tracks ADD CONSTRAINT fk_playlist_tracks_track
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

-- player_queue also gets a row id so duplicate queue entries remain stable.
ALTER TABLE player_queue ADD COLUMN id VARCHAR(36) NULL FIRST;
UPDATE player_queue SET id = UUID() WHERE id IS NULL;
ALTER TABLE player_queue MODIFY id VARCHAR(36) NOT NULL;
ALTER TABLE player_queue ADD PRIMARY KEY (id);
CREATE INDEX idx_player_queue_session_position ON player_queue (session_id, position);
CREATE INDEX idx_player_queue_track ON player_queue (track_id);
ALTER TABLE player_queue ADD CONSTRAINT fk_player_queue_track
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

-- Keep delete requests attached to tracks until hard delete; hard delete cascades/removes them.
ALTER TABLE track_delete_requests ADD CONSTRAINT fk_track_delete_requests_track
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;
