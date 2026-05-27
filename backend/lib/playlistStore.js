const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'playlists.json');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function save(playlists) {
  fs.writeFileSync(DB_PATH, JSON.stringify(playlists, null, 2), 'utf8');
}

function getAllPlaylists() {
  return load().map(p => ({ ...p }));
}

// 사용자별 기본 재생목록 보장 (없으면 생성)
function ensureDefaultPlaylist(userId) {
  const playlists = load();
  const existing = playlists.find(p => p.userId === userId && p.isDefault === true);
  if (existing) return { ...existing };
  const p = {
    id: uuidv4(),
    userId,
    name: '기본 재생목록',
    trackIds: [],
    createdAt: new Date().toISOString(),
    isDefault: true,
  };
  playlists.push(p);
  save(playlists);
  return { ...p };
}

function getDefaultPlaylistByUserId(userId) {
  return load().find(p => p.userId === userId && p.isDefault === true) || null;
}

function getPlaylistsByUserId(userId) {
  return load().filter(p => p.userId === userId).map(p => ({ ...p }));
}

function getPlaylistById(id) {
  return load().find(p => p.id === id) || null;
}

function isOwnedBy(playlist, userId) {
  return playlist.userId === userId;
}

function createPlaylist(name, userId) {
  const playlists = load();
  const p = {
    id: uuidv4(),
    userId: userId || null,
    name: name.trim(),
    trackIds: [],
    createdAt: new Date().toISOString(),
    isDefault: false,
  };
  playlists.push(p);
  save(playlists);
  return p;
}

function renamePlaylist(id, name) {
  const playlists = load();
  const p = playlists.find(x => x.id === id);
  if (!p) return null;
  p.name = name.trim();
  save(playlists);
  return p;
}

function deletePlaylist(id) {
  const playlists = load();
  const idx = playlists.findIndex(p => p.id === id);
  if (idx === -1 || playlists[idx].isDefault) return null;
  const [removed] = playlists.splice(idx, 1);
  save(playlists);
  return removed;
}

function addTrack(playlistId, trackId) {
  const playlists = load();
  const p = playlists.find(x => x.id === playlistId);
  if (!p) return null;
  if (p.trackIds.includes(trackId)) return { ...p, alreadyExists: true };
  p.trackIds.push(trackId);
  save(playlists);
  return p;
}

function removeTrackAt(playlistId, index) {
  const playlists = load();
  const p = playlists.find(x => x.id === playlistId);
  if (!p || index < 0 || index >= p.trackIds.length) return null;
  p.trackIds.splice(index, 1);
  save(playlists);
  return p;
}

// trackId 기준 첫 번째 항목 제거 (인덱스 경쟁 조건 방지)
function removeTrackFirstById(playlistId, trackId) {
  const playlists = load();
  const p = playlists.find(x => x.id === playlistId);
  if (!p) return null;
  const idx = p.trackIds.indexOf(trackId);
  if (idx === -1) return null;
  p.trackIds.splice(idx, 1);
  save(playlists);
  return p;
}

function setTracks(playlistId, trackIds) {
  const playlists = load();
  const p = playlists.find(x => x.id === playlistId);
  if (!p) return null;
  p.trackIds = [...trackIds];
  save(playlists);
  return p;
}

// 모든 플레이리스트에서 특정 트랙 ID 전부 제거 (트랙 삭제 시 호출)
function removeTrackFromAll(trackId) {
  const playlists = load();
  playlists.forEach(p => {
    p.trackIds = p.trackIds.filter(id => id !== trackId);
  });
  save(playlists);
}

module.exports = { getAllPlaylists, ensureDefaultPlaylist, getDefaultPlaylistByUserId, getPlaylistsByUserId, getPlaylistById, isOwnedBy, createPlaylist, renamePlaylist, deletePlaylist, addTrack, removeTrackAt, removeTrackFirstById, removeTrackFromAll, setTracks };
