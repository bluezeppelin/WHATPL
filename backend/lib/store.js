const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function rowToTrack(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    genre: row.genre,
    description: row.description,
    audioUrl: row.audio_url,
    audioKey: row.audio_key,
    coverUrl: row.cover_url,
    coverKey: row.cover_key,
    duration: row.duration,
    plays: row.plays,
    likes: row.likes,
    uploadedByUserId: row.uploaded_by_user_id,
    status: row.status,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deleteReason: row.delete_reason,
    suspendedAt: row.suspended_at,
    suspendedBy: row.suspended_by,
  };
}

async function getAllTracks() {
  const [rows] = await db.execute(
    `SELECT * FROM tracks WHERE status NOT IN ('deleted','suspended') ORDER BY created_at DESC`
  );
  return rows.map(rowToTrack);
}

async function getAllTracksIncludingDeleted() {
  const [rows] = await db.execute(`SELECT * FROM tracks ORDER BY created_at DESC`);
  return rows.map(rowToTrack);
}

async function getTrackById(id) {
  const [rows] = await db.execute(`SELECT * FROM tracks WHERE id = ?`, [id]);
  return rows.length ? rowToTrack(rows[0]) : null;
}

async function createTrack({ title, artist, genre, description, audioUrl, audioKey, coverUrl, coverKey, duration, uploadedByUserId }) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO tracks
       (id, title, artist, genre, description, audio_url, audio_key, cover_url, cover_key,
        duration, plays, likes, uploaded_by_user_id, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,0,0,?,'active',NOW())`,
    [id, title, artist || '알 수 없는 아티스트', genre || '', description || '',
     audioUrl, audioKey, coverUrl || null, coverKey || null, duration || 0, uploadedByUserId || null]
  );
  return getTrackById(id);
}

async function updateTrack(id, fields) {
  const colMap = {
    title: 'title', artist: 'artist', genre: 'genre', description: 'description',
    coverUrl: 'cover_url', coverKey: 'cover_key',
  };
  const setClauses = [], values = [];
  for (const [jsKey, col] of Object.entries(colMap)) {
    if (fields[jsKey] !== undefined) { setClauses.push(`${col} = ?`); values.push(fields[jsKey]); }
  }
  if (!setClauses.length) return getTrackById(id);
  values.push(id);
  await db.execute(`UPDATE tracks SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return getTrackById(id);
}

async function incrementPlays(id) {
  await db.execute(`UPDATE tracks SET plays = plays + 1 WHERE id = ?`, [id]);
}

async function deleteTrack(id) {
  const track = await getTrackById(id);
  if (!track) return null;
  await db.execute(`DELETE FROM tracks WHERE id = ?`, [id]);
  return track;
}

async function softDeleteTrack(id, deletedBy, deleteReason) {
  await db.execute(
    `UPDATE tracks SET status='deleted', deleted_at=NOW(), deleted_by=?, delete_reason=? WHERE id=?`,
    [deletedBy || null, deleteReason || '', id]
  );
  return getTrackById(id);
}

async function suspendTracksByUser(userId, suspendedBy) {
  await db.execute(
    `UPDATE tracks SET status='suspended', suspended_at=NOW(), suspended_by=?
     WHERE uploaded_by_user_id=? AND status NOT IN ('deleted','suspended')`,
    [suspendedBy, userId]
  );
}

async function restoreTracksByUser(userId) {
  await db.execute(
    `UPDATE tracks SET status='active', suspended_at=NULL, suspended_by=NULL
     WHERE uploaded_by_user_id=? AND status='suspended'`,
    [userId]
  );
}

module.exports = {
  getAllTracks, getAllTracksIncludingDeleted, getTrackById,
  createTrack, updateTrack, incrementPlays,
  deleteTrack, softDeleteTrack, suspendTracksByUser, restoreTracksByUser,
};
