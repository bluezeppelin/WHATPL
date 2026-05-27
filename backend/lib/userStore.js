const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/users.json');

function readUsers() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '[]', 'utf-8');
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeUsers(users) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

function findById(id) {
  return readUsers().find((u) => u.id === id) || null;
}

function findByLoginId(loginId) {
  return readUsers().find((u) => u.loginId === loginId) || null;
}

function findByEmail(email) {
  return readUsers().find((u) => u.email === email) || null;
}

function findByArtistName(artistName) {
  const normalized = artistName.toLowerCase();
  return readUsers().find(
    (u) => u.artistName && u.artistName.toLowerCase() === normalized
  ) || null;
}

function createUser(userData) {
  const users = readUsers();
  users.push(userData);
  writeUsers(users);
  return userData;
}

function updateUser(id, updates) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
  writeUsers(users);
  return users[idx];
}

function isEmailTakenByOtherUser(email, userId) {
  return readUsers().some(u => u.email === email && u.id !== userId);
}

function isArtistNameTakenByOtherUser(artistName, userId) {
  const normalized = artistName.toLowerCase();
  return readUsers().some(u => u.artistName && u.artistName.toLowerCase() === normalized && u.id !== userId);
}

function findUserByNameAndEmail(name, email) {
  return readUsers().find(
    u => u.name === name && u.email.toLowerCase() === email.toLowerCase()
  ) || null;
}

function findUserByLoginIdAndEmail(loginId, email) {
  return readUsers().find(
    u => u.loginId === loginId && u.email.toLowerCase() === email.toLowerCase()
  ) || null;
}

function getAllUsers({ role, status } = {}) {
  let users = readUsers();
  if (role) users = users.filter(u => u.role === role);
  if (status) users = users.filter(u => (u.status || 'active') === status);
  return users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// passwordHash를 제외한 안전한 사용자 객체 반환
function sanitize(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { findById, findByLoginId, findByEmail, findByArtistName, createUser, updateUser, getAllUsers, sanitize, isEmailTakenByOtherUser, isArtistNameTakenByOtherUser, findUserByNameAndEmail, findUserByLoginIdAndEmail };
