'use strict';

const db = require('./db');

async function cleanupTrackForSoftDelete(trackId) {
  await db.execute(`UPDATE player_sessions SET track_id = NULL WHERE track_id = ?`, [trackId]);
  await db.execute(`DELETE FROM player_queue WHERE track_id = ?`, [trackId]);
  await db.execute(`DELETE FROM playlist_tracks WHERE track_id = ?`, [trackId]);
  await db.execute(`DELETE FROM liked_tracks WHERE track_id = ?`, [trackId]);
  await db.execute(`DELETE FROM recently_played WHERE track_id = ?`, [trackId]);
}

async function cleanupTrackForHardDelete(trackId) {
  await cleanupTrackForSoftDelete(trackId);
  await db.execute(`DELETE FROM track_delete_requests WHERE track_id = ?`, [trackId]);
}

module.exports = { cleanupTrackForSoftDelete, cleanupTrackForHardDelete };
