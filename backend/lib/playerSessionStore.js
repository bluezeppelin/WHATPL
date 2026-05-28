const { v4: uuidv4 } = require('uuid');
const db = require('./db');

async function getByUser(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM player_sessions WHERE user_id = ?`, [userId]
  );
  if (!rows.length) return null;
  const session = rows[0];
  const [queue] = await db.execute(
    `SELECT track_id FROM player_queue WHERE session_id = ? ORDER BY position ASC, id ASC`,
    [session.id]
  );
  session.queueTrackIds = queue.map(r => r.track_id);
  session.userId = session.user_id;
  session.trackId = session.track_id;
  session.currentTime = session.position_sec;
  session.currentIndex = session.current_index;
  session.queueType = session.queue_type;
  session.queueSourceId = session.queue_source_id;
  session.repeatMode = session.repeat_mode;
  session.shuffle = !!session.shuffle;
  return session;
}

async function upsert(userId, fields) {
  const existing = await getByUser(userId);
  const id = existing ? existing.id : uuidv4();

  if (existing) {
    const colMap = {
      trackId: 'track_id', currentTime: 'position_sec', currentIndex: 'current_index',
      queueType: 'queue_type', queueSourceId: 'queue_source_id',
      repeatMode: 'repeat_mode', shuffle: 'shuffle',
    };
    const setClauses = [], values = [];
    for (const [jsKey, col] of Object.entries(colMap)) {
      if (fields[jsKey] !== undefined) {
        setClauses.push(`${col} = ?`);
        values.push(jsKey === 'shuffle' ? (fields[jsKey] ? 1 : 0) : fields[jsKey]);
      }
    }
    if (setClauses.length) {
      values.push(id);
      await db.execute(`UPDATE player_sessions SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }
  } else {
    await db.execute(
      `INSERT INTO player_sessions
         (id, user_id, track_id, position_sec, current_index, queue_type, queue_source_id, repeat_mode, shuffle)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id, userId,
        fields.trackId || null,
        fields.currentTime || 0,
        fields.currentIndex || 0,
        fields.queueType || null,
        fields.queueSourceId || null,
        fields.repeatMode || 'none',
        fields.shuffle ? 1 : 0,
      ]
    );
  }

  if (Array.isArray(fields.queueTrackIds)) {
    await db.execute(`DELETE FROM player_queue WHERE session_id = ?`, [id]);
    for (let i = 0; i < fields.queueTrackIds.length; i++) {
      await db.execute(
        `INSERT INTO player_queue (id, session_id, track_id, position) VALUES (?, ?, ?, ?)`,
        [uuidv4(), id, fields.queueTrackIds[i], i]
      );
    }
  }

  return getByUser(userId);
}

async function removeTrackFromSessions(trackId) {
  await db.execute(`UPDATE player_sessions SET track_id = NULL WHERE track_id = ?`, [trackId]);
  await db.execute(`DELETE FROM player_queue WHERE track_id = ?`, [trackId]);
}

module.exports = { upsert, getByUser, removeTrackFromSessions };
