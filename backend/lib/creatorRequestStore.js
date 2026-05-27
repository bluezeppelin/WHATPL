const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/creatorRequests.json');

function readRequests() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '[]', 'utf-8');
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeRequests(requests) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(requests, null, 2), 'utf-8');
}

function findPendingByUserId(userId) {
  return readRequests().find(r => r.userId === userId && r.status === 'pending') || null;
}

function getLatestByUserId(userId) {
  const all = readRequests().filter(r => r.userId === userId);
  if (all.length === 0) return null;
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function createRequest(data) {
  const requests = readRequests();
  requests.push(data);
  writeRequests(requests);
  return data;
}

function getAllRequests() {
  return readRequests();
}

function findById(id) {
  return readRequests().find(r => r.id === id) || null;
}

function updateRequest(id, updates) {
  const requests = readRequests();
  const idx = requests.findIndex(r => r.id === id);
  if (idx === -1) return null;
  requests[idx] = { ...requests[idx], ...updates, updatedAt: new Date().toISOString() };
  writeRequests(requests);
  return requests[idx];
}

module.exports = { findPendingByUserId, getLatestByUserId, createRequest, getAllRequests, findById, updateRequest };
