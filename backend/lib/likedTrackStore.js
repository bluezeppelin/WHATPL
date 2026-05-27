const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/likedTracks.json');

function readLikes() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '[]', 'utf-8');
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeLikes(likes) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(likes, null, 2), 'utf-8');
}

function findByUserAndTrack(userId, trackId) {
  return readLikes().find(l => l.userId === userId && l.trackId === trackId) || null;
}

function getLikedByUser(userId) {
  return readLikes().filter(l => l.userId === userId);
}

function addLike(data) {
  const likes = readLikes();
  likes.push(data);
  writeLikes(likes);
  return data;
}

function removeLike(userId, trackId) {
  const likes = readLikes();
  const filtered = likes.filter(l => !(l.userId === userId && l.trackId === trackId));
  writeLikes(filtered);
}

function removeByTrackId(trackId) {
  const likes = readLikes();
  writeLikes(likes.filter(l => l.trackId !== trackId));
}

// 트랙별 누적 좋아요 수 집계 — { trackId: count }
function getAllLikeCounts() {
  const counts = {};
  for (const like of readLikes()) {
    counts[like.trackId] = (counts[like.trackId] || 0) + 1;
  }
  return counts;
}

module.exports = { findByUserAndTrack, getLikedByUser, addLike, removeLike, removeByTrackId, getAllLikeCounts };
