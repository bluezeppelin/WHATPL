const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function rowToLog(row) {
  return {
    id: row.id,
    trackId: row.track_id,
    title: row.title,
    artist: row.artist,
    deletedBy: row.deleted_by,
    reason: row.reason,
    deletedAt: row.deleted_at,
  };
}

async function addLog({ trackId, title, artist, deletedBy, reason }) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO hard_delete_logs (id, track_id, title, artist, deleted_by, reason, deleted_at)
     VALUES (?,?,?,?,?,?,NOW())`,
    [id, trackId || null, title || '', artist || '', deletedBy, reason || 'hard delete by admin']
  );
  const [rows] = await db.execute(`SELECT * FROM hard_delete_logs WHERE id = ?`, [id]);
  return rows.length ? rowToLog(rows[0]) : null;
}

async function getAll() {
  const [rows] = await db.execute(
    `SELECT * FROM hard_delete_logs ORDER BY deleted_at DESC`
  );
  return rows.map(rowToLog);
}

module.exports = { addLog, getAll };
