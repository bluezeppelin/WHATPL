const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const MAX_HISTORY = 30;

async function addOrUpdate(userId, trackId) {
  await db.execute(
    `DELETE FROM recently_played WHERE user_id = ? AND track_id = ?`, [userId, trackId]
  );
  const id = uuidv4();
  await db.execute(
    `INSERT INTO recently_played (id, user_id, track_id, played_at) VALUES (?, ?, ?, NOW())`,
    [id, userId, trackId]
  );
  // MAX_HISTORY 초과 항목 삭제
  await db.execute(
    `DELETE FROM recently_played
     WHERE user_id = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM recently_played
           WHERE user_id = ?
           ORDER BY played_at DESC
           LIMIT ?
         ) sub
       )`,
    [userId, userId, MAX_HISTORY]
  );
  const [rows] = await db.execute(
    `SELECT * FROM recently_played WHERE user_id = ? AND track_id = ?`, [userId, trackId]
  );
  return rows.length ? rowToRecord(rows[0]) : null;
}

function rowToRecord(row) {
  return {
    id: row.id,
    userId: row.user_id,
    trackId: row.track_id,
    playedAt: row.played_at,
  };
}

async function getByUser(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM recently_played WHERE user_id = ? ORDER BY played_at DESC LIMIT ?`,
    [userId, MAX_HISTORY]
  );
  return rows.map(rowToRecord);
}

async function removeByTrackId(trackId) {
  await db.execute(`DELETE FROM recently_played WHERE track_id = ?`, [trackId]);
}

async function getTrendingTrackCounts(days = 7) {
  const [rows] = await db.execute(
    `SELECT track_id, COUNT(*) AS count
     FROM recently_played
     WHERE played_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY track_id
     ORDER BY count DESC`,
    [days]
  );
  return rows.map(r => ({ trackId: r.track_id, count: r.count }));
}

module.exports = { addOrUpdate, getByUser, removeByTrackId, getTrendingTrackCounts };
