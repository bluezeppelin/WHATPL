const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function rowToReq(row) {
  return {
    id: row.id,
    trackId: row.track_id,
    creatorUserId: row.creator_user_id,
    creatorLoginId: row.creator_login_id,
    artistName: row.artist_name,
    trackTitle: row.track_title,
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findById(id) {
  const [rows] = await db.execute(`SELECT * FROM track_delete_requests WHERE id = ?`, [id]);
  return rows.length ? rowToReq(rows[0]) : null;
}

async function getAll(status) {
  let sql = `SELECT * FROM track_delete_requests`;
  const params = [];
  if (status) { sql += ` WHERE status = ?`; params.push(status); }
  sql += ` ORDER BY created_at DESC`;
  const [rows] = await db.execute(sql, params);
  return rows.map(rowToReq);
}

async function findPendingByTrackId(trackId) {
  const [rows] = await db.execute(
    `SELECT * FROM track_delete_requests WHERE track_id = ? AND status = 'pending'`, [trackId]
  );
  return rows.length ? rowToReq(rows[0]) : null;
}

async function getByCreatorUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM track_delete_requests WHERE creator_user_id = ? ORDER BY created_at DESC`, [userId]
  );
  return rows.map(rowToReq);
}

async function create({ trackId, creatorUserId, creatorLoginId, artistName, trackTitle, reason }) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO track_delete_requests
       (id, track_id, creator_user_id, creator_login_id, artist_name, track_title, reason, status)
     VALUES (?,?,?,?,?,?,?,'pending')`,
    [id, trackId, creatorUserId, creatorLoginId || null, artistName || '', trackTitle, reason || '']
  );
  return findById(id);
}

async function update(id, fields) {
  const colMap = {
    status: 'status', reviewedBy: 'reviewed_by',
    reviewedAt: 'reviewed_at', rejectReason: 'reject_reason',
  };
  const setClauses = [], values = [];
  for (const [jsKey, col] of Object.entries(colMap)) {
    if (fields[jsKey] !== undefined) { setClauses.push(`${col} = ?`); values.push(fields[jsKey]); }
  }
  if (!setClauses.length) return findById(id);
  values.push(id);
  await db.execute(`UPDATE track_delete_requests SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function removeByTrackId(trackId) {
  await db.execute(`DELETE FROM track_delete_requests WHERE track_id = ?`, [trackId]);
}

module.exports = { getAll, findPendingByTrackId, getByCreatorUserId, create, findById, update, removeByTrackId };
