const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'tracks.json');

// data 폴더 없으면 생성
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function save(tracks) {
  fs.writeFileSync(DB_PATH, JSON.stringify(tracks, null, 2), 'utf8');
}

function getAllTracks() {
  const tracks = load();
  return tracks
    .filter(t => t.status !== 'deleted' && t.status !== 'suspended')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getAllTracksIncludingDeleted() {
  const tracks = load();
  return tracks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getTrackById(id) {
  return load().find(t => t.id === id) || null;
}

function createTrack({ title, artist, genre, description, audioUrl, audioKey, coverUrl, coverKey, duration, uploadedByUserId }) {
  const tracks = load();
  const track = {
    id: uuidv4(),
    title,
    artist: artist || '알 수 없는 아티스트',
    genre: genre || '',
    description: description || '',
    audioUrl,
    audioKey,
    coverUrl,
    coverKey,
    duration: duration || 0,
    plays: 0,
    likes: 0,
    uploadedByUserId: uploadedByUserId || null,
    createdAt: new Date().toISOString(),
  };
  tracks.push(track);
  save(tracks);
  return track;
}

function incrementPlays(id) {
  const tracks = load();
  const track = tracks.find(t => t.id === id);
  if (track) {
    track.plays += 1;
    save(tracks);
  }
}

function updateTrack(id, fields) {
  const tracks = load();
  const track = tracks.find(t => t.id === id);
  if (!track) return null;
  const allowed = ['title', 'artist', 'genre', 'description', 'coverUrl', 'coverKey', 'album', 'trackNumber', 'releaseYear'];
  allowed.forEach(key => {
    if (fields[key] !== undefined) track[key] = fields[key];
  });
  save(tracks);
  return track;
}

function deleteTrack(id) {
  const tracks = load();
  const idx = tracks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const [removed] = tracks.splice(idx, 1);
  save(tracks);
  return removed;
}

function softDeleteTrack(id, deletedBy, deleteReason) {
  const tracks = load();
  const track = tracks.find(t => t.id === id);
  if (!track) return null;
  track.status = 'deleted';
  track.deletedAt = new Date().toISOString();
  track.deletedBy = deletedBy || null;
  track.deleteReason = deleteReason || '';
  save(tracks);
  return track;
}

// 계정 비활성화 시 해당 유저의 활성 트랙을 suspended로 전환
function suspendTracksByUser(userId, suspendedBy) {
  const tracks = load();
  const now = new Date().toISOString();
  tracks.forEach(t => {
    if (t.uploadedByUserId === userId && t.status !== 'deleted' && t.status !== 'suspended') {
      t.status = 'suspended';
      t.suspendedAt = now;
      t.suspendedBy = suspendedBy;
    }
  });
  save(tracks);
}

// 계정 활성화 시 suspended 트랙만 복구 (admin이 삭제한 deleted 트랙은 유지)
function restoreTracksByUser(userId) {
  const tracks = load();
  tracks.forEach(t => {
    if (t.uploadedByUserId === userId && t.status === 'suspended') {
      delete t.status;
      delete t.suspendedAt;
      delete t.suspendedBy;
    }
  });
  save(tracks);
}

module.exports = { getAllTracks, getAllTracksIncludingDeleted, getTrackById, createTrack, updateTrack, incrementPlays, deleteTrack, softDeleteTrack, suspendTracksByUser, restoreTracksByUser };
