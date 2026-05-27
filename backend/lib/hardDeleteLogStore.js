const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'hardDeleteLogs.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return []; }
}

function save(logs) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(logs, null, 2), 'utf8');
}

function addLog({ trackId, title, artist, deletedBy, reason }) {
  const logs = load();
  const entry = {
    id: uuidv4(),
    trackId,
    title: title || '',
    artist: artist || '',
    deletedBy,
    deletedAt: new Date().toISOString(),
    reason: reason || 'hard delete by admin',
  };
  logs.unshift(entry);
  save(logs);
  return entry;
}

function getAll() {
  return load();
}

module.exports = { addLog, getAll };
