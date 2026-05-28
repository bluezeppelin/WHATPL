const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function rowToRequest(row) {
  return {
    id: row.id,
    userId: row.user_id,
    loginId: row.login_id,
    name: row.name,
    artistName: row.artist_name,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    rejectReason: row.reject_reason,
  };
}

async function findById(id) {
  const [rows] = await db.execute(`SELECT * FROM creator_requests WHERE id = ?`, [id]);
  return rows.length ? rowToRequest(rows[0]) : null;
}

async function findPendingByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM creator_requests WHERE user_id = ? AND status = 'pending'`, [userId]
  );
  return rows.length ? rowToRequest(rows[0]) : null;
}

async function getLatestByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM creator_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId]
  );
  return rows.length ? rowToRequest(rows[0]) : null;
}

async function createRequest(data) {
  const id = data.id || uuidv4();
  await db.execute(
    `INSERT INTO creator_requests (id, user_id, login_id, name, artist_name, message, status)
     VALUES (?,?,?,?,?,?,'pending')`,
    [id, data.userId, data.loginId || null, data.name || null, data.artistName || null, data.message || null]
  );
  return findById(id);
}

async function getAllRequests() {
  const [rows] = await db.execute(`SELECT * FROM creator_requests ORDER BY created_at DESC`);
  return rows.map(rowToRequest);
}

async function updateRequest(id, updates) {
  const colMap = {
    status: 'status', reviewedAt: 'reviewed_at', reviewedBy: 'reviewed_by', rejectReason: 'reject_reason',
  };
  const setClauses = [], values = [];
  for (const [jsKey, col] of Object.entries(colMap)) {
    if (updates[jsKey] !== undefined) { setClauses.push(`${col} = ?`); values.push(updates[jsKey]); }
  }
  if (!setClauses.length) return findById(id);
  values.push(id);
  await db.execute(`UPDATE creator_requests SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

module.exports = { findPendingByUserId, getLatestByUserId, createRequest, getAllRequests, findById, updateRequest };
