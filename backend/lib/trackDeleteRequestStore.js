const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/trackDeleteRequests.json');

function read() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '[]', 'utf-8');
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function write(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getAll(status) {
  const all = read();
  if (status) return all.filter(r => r.status === status);
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findPendingByTrackId(trackId) {
  return read().find(r => r.trackId === trackId && r.status === 'pending') || null;
}

function getByCreatorUserId(userId) {
  return read().filter(r => r.creatorUserId === userId);
}

function create({ trackId, creatorUserId, creatorLoginId, artistName, trackTitle, reason }) {
  const requests = read();
  const req = {
    id: uuidv4(),
    trackId,
    creatorUserId,
    creatorLoginId,
    artistName: artistName || '',
    trackTitle,
    reason: reason || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    rejectReason: null,
  };
  requests.push(req);
  write(requests);
  return req;
}

function findById(id) {
  return read().find(r => r.id === id) || null;
}

function update(id, fields) {
  const requests = read();
  const req = requests.find(r => r.id === id);
  if (!req) return null;
  Object.assign(req, fields, { updatedAt: new Date().toISOString() });
  write(requests);
  return req;
}

function removeByTrackId(trackId) {
  write(read().filter(r => r.trackId !== trackId));
}

module.exports = { getAll, findPendingByTrackId, getByCreatorUserId, create, findById, update, removeByTrackId };
