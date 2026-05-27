const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'recentlyPlayed.json');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return []; }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function addOrUpdate(userId, trackId) {
  const records = load();
  const now = new Date().toISOString();
  const idx = records.findIndex(r => r.userId === userId && r.trackId === trackId);

  if (idx !== -1) {
    records[idx].playedAt = now;
    records[idx].updatedAt = now;
  } else {
    records.push({ id: uuidv4(), userId, trackId, playedAt: now, createdAt: now, updatedAt: now });
  }

  // 사용자별 최근 30개만 유지 (오래된 것 제거)
  const userRecords = records
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
  const toRemoveIds = new Set(userRecords.slice(30).map(r => r.id));
  const saved = records.filter(r => !toRemoveIds.has(r.id));
  save(saved);
  return saved.find(r => r.userId === userId && r.trackId === trackId);
}

function getByUser(userId) {
  return load()
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
}

function removeByTrackId(trackId) {
  const records = load();
  save(records.filter(r => r.trackId !== trackId));
}

// 최근 days일 동안 trackId별 재생 유저 수를 집계해 내림차순으로 반환
// MySQL 전환 시 이 함수만 교체:
//   SELECT track_id, COUNT(*) AS cnt
//   FROM recently_played
//   WHERE played_at >= DATE_SUB(NOW(), INTERVAL days DAY)
//   GROUP BY track_id ORDER BY cnt DESC
function getTrendingTrackCounts(days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const counts = {};
  load()
    .filter(r => r.playedAt && new Date(r.playedAt) >= cutoff)
    .forEach(r => { counts[r.trackId] = (counts[r.trackId] || 0) + 1; });
  return Object.entries(counts)
    .map(([trackId, count]) => ({ trackId, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = { addOrUpdate, getByUser, removeByTrackId, getTrendingTrackCounts };
