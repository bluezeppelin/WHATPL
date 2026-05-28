const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function rowToLike(row) {
  return {
    id: row.id,
    userId: row.user_id,
    trackId: row.track_id,
    createdAt: row.created_at,
  };
}

async function findByUserAndTrack(userId, trackId) {
  const [rows] = await db.execute(
    `SELECT * FROM liked_tracks WHERE user_id = ? AND track_id = ?`, [userId, trackId]
  );
  return rows.length ? rowToLike(rows[0]) : null;
}

async function getLikedByUser(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM liked_tracks WHERE user_id = ? ORDER BY created_at DESC`, [userId]
  );
  return rows.map(rowToLike);
}

async function addLike(data) {
  const id = data.id || uuidv4();
  const [result] = await db.execute(
    `INSERT IGNORE INTO liked_tracks (id, user_id, track_id) VALUES (?, ?, ?)`,
    [id, data.userId, data.trackId]
  );
  if (result.affectedRows > 0) {
    await db.execute(`UPDATE tracks SET likes = likes + 1 WHERE id = ?`, [data.trackId]);
  }
  return { ...data, inserted: result.affectedRows > 0 };
}

async function removeLike(userId, trackId) {
  const [result] = await db.execute(
    `DELETE FROM liked_tracks WHERE user_id = ? AND track_id = ?`, [userId, trackId]
  );
  if (result.affectedRows > 0) {
    await db.execute(`UPDATE tracks SET likes = GREATEST(likes - 1, 0) WHERE id = ?`, [trackId]);
  }
}

async function removeByTrackId(trackId) {
  await db.execute(`DELETE FROM liked_tracks WHERE track_id = ?`, [trackId]);
}

async function getAllLikeCounts() {
  const [rows] = await db.execute(
    `SELECT track_id, COUNT(*) as cnt FROM liked_tracks GROUP BY track_id`
  );
  const counts = {};
  for (const row of rows) counts[row.track_id] = row.cnt;
  return counts;
}

module.exports = { findByUserAndTrack, getLikedByUser, addLike, removeLike, removeByTrackId, getAllLikeCounts };
