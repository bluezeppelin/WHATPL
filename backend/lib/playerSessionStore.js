const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'playerSessions.json');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return []; }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function upsert(userId, fields) {
  const sessions = load();
  const now = new Date().toISOString();
  const idx = sessions.findIndex(s => s.userId === userId);
  if (idx !== -1) {
    sessions[idx] = { ...sessions[idx], ...fields, userId, updatedAt: now };
    save(sessions);
    return sessions[idx];
  }
  const session = { id: uuidv4(), userId, ...fields, createdAt: now, updatedAt: now };
  sessions.push(session);
  save(sessions);
  return session;
}

function getByUser(userId) {
  return load().find(s => s.userId === userId) || null;
}

function removeTrackFromSessions(trackId) {
  const sessions = load();
  sessions.forEach(s => {
    if (s.trackId === trackId) s.trackId = null;
    if (Array.isArray(s.queueTrackIds)) s.queueTrackIds = s.queueTrackIds.filter(id => id !== trackId);
  });
  save(sessions);
}

module.exports = { upsert, getByUser, removeTrackFromSessions };
