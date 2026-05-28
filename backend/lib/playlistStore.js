const { v4: uuidv4 } = require('uuid');
const db = require('./db');

async function getPlaylistById(id) {
  const [rows] = await db.execute(`SELECT * FROM playlists WHERE id = ?`, [id]);
  if (!rows.length) return null;
  const pl = rows[0];
  const [tracks] = await db.execute(
    `SELECT id, track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC, id ASC`, [id]
  );
  pl.playlistTrackIds = tracks.map(r => r.id);
  pl.trackIds = tracks.map(r => r.track_id);
  pl.isDefault = !!pl.is_default;
  pl.userId = pl.user_id;
  pl.createdAt = pl.created_at;
  return pl;
}

async function getAllPlaylists() {
  const [playlists] = await db.execute(`SELECT * FROM playlists ORDER BY created_at ASC`);
  for (const pl of playlists) {
    const [tracks] = await db.execute(
      `SELECT id, track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC, id ASC`, [pl.id]
    );
    pl.playlistTrackIds = tracks.map(r => r.id);
    pl.trackIds = tracks.map(r => r.track_id);
    pl.isDefault = !!pl.is_default;
    pl.userId = pl.user_id;
    pl.createdAt = pl.created_at;
  }
  return playlists;
}

async function getPlaylistsByUserId(userId) {
  const [playlists] = await db.execute(
    `SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at ASC`, [userId]
  );
  for (const pl of playlists) {
    const [tracks] = await db.execute(
      `SELECT id, track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC, id ASC`, [pl.id]
    );
    pl.playlistTrackIds = tracks.map(r => r.id);
    pl.trackIds = tracks.map(r => r.track_id);
    pl.isDefault = !!pl.is_default;
    pl.userId = pl.user_id;
    pl.createdAt = pl.created_at;
  }
  return playlists;
}

async function getDefaultPlaylistByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM playlists WHERE user_id = ? AND is_default = 1`, [userId]
  );
  if (!rows.length) return null;
  return getPlaylistById(rows[0].id);
}

async function ensureDefaultPlaylist(userId) {
  const existing = await getDefaultPlaylistByUserId(userId);
  if (existing) return existing;
  const id = uuidv4();
  await db.execute(
    `INSERT INTO playlists (id, user_id, name, is_default) VALUES (?, ?, '기본 재생목록', 1)`,
    [id, userId]
  );
  return getPlaylistById(id);
}

function isOwnedBy(playlist, userId) {
  return (playlist.userId || playlist.user_id) === userId;
}

async function createPlaylist(name, userId) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO playlists (id, user_id, name, is_default) VALUES (?, ?, ?, 0)`,
    [id, userId || null, name.trim()]
  );
  return getPlaylistById(id);
}

async function renamePlaylist(id, name) {
  await db.execute(`UPDATE playlists SET name = ? WHERE id = ?`, [name.trim(), id]);
  return getPlaylistById(id);
}

async function deletePlaylist(id) {
  const pl = await getPlaylistById(id);
  if (!pl || pl.isDefault) return null;
  await db.execute(`DELETE FROM playlists WHERE id = ?`, [id]);
  return pl;
}

async function normalizePositions(playlistId) {
  const [rows] = await db.execute(
    `SELECT id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC, id ASC`, [playlistId]
  );
  for (let i = 0; i < rows.length; i++) {
    await db.execute(`UPDATE playlist_tracks SET position = ? WHERE id = ?`, [i, rows[i].id]);
  }
}

async function addTrack(playlistId, trackId) {
  const pl = await getPlaylistById(playlistId);
  if (!pl) return null;
  const [maxPos] = await db.execute(
    `SELECT MAX(position) as maxPos FROM playlist_tracks WHERE playlist_id = ?`, [playlistId]
  );
  const position = (maxPos[0].maxPos ?? -1) + 1;
  await db.execute(
    `INSERT INTO playlist_tracks (id, playlist_id, track_id, position) VALUES (?, ?, ?, ?)`,
    [uuidv4(), playlistId, trackId, position]
  );
  return getPlaylistById(playlistId);
}

async function removeTrackAt(playlistId, index) {
  const pl = await getPlaylistById(playlistId);
  if (!pl || index < 0 || index >= pl.playlistTrackIds.length) return null;
  await db.execute(`DELETE FROM playlist_tracks WHERE id = ?`, [pl.playlistTrackIds[index]]);
  await normalizePositions(playlistId);
  return getPlaylistById(playlistId);
}

async function removeTrackFirstById(playlistId, trackId) {
  const [rows] = await db.execute(
    `SELECT id FROM playlist_tracks WHERE playlist_id = ? AND track_id = ? ORDER BY position ASC, id ASC LIMIT 1`,
    [playlistId, trackId]
  );
  if (!rows.length) return null;
  await db.execute(`DELETE FROM playlist_tracks WHERE id = ?`, [rows[0].id]);
  await normalizePositions(playlistId);
  return getPlaylistById(playlistId);
}

async function setTracks(playlistId, trackIds) {
  await db.execute(`DELETE FROM playlist_tracks WHERE playlist_id = ?`, [playlistId]);
  for (let i = 0; i < trackIds.length; i++) {
    await db.execute(
      `INSERT INTO playlist_tracks (id, playlist_id, track_id, position) VALUES (?, ?, ?, ?)`,
      [uuidv4(), playlistId, trackIds[i], i]
    );
  }
  return getPlaylistById(playlistId);
}

async function removeTrackFromAll(trackId) {
  await db.execute(`DELETE FROM playlist_tracks WHERE track_id = ?`, [trackId]);
}

module.exports = {
  getAllPlaylists, getPlaylistById, getPlaylistsByUserId, getDefaultPlaylistByUserId,
  ensureDefaultPlaylist, isOwnedBy, createPlaylist, renamePlaylist, deletePlaylist,
  addTrack, removeTrackAt, removeTrackFirstById, setTracks, removeTrackFromAll,
};
