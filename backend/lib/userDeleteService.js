'use strict';

const fs = require('fs');
const path = require('path');

const { findById } = require('./userStore');
const { deleteFromS3 } = require('./s3');
const trackStore = require('./store');
const likedTrackStore = require('./likedTrackStore');
const recentlyPlayedStore = require('./recentlyPlayedStore');
const playerSessionStore = require('./playerSessionStore');
const playlistStore = require('./playlistStore');
const trackDeleteRequestStore = require('./trackDeleteRequestStore');

const DATA_DIR = path.join(__dirname, '../data');

function readJson(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function writeJson(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

async function safeDelete(key) {
  try { await deleteFromS3(key); } catch {}
}

async function deleteUserAccount(userId) {
  const user = findById(userId);
  if (!user) throw new Error('사용자를 찾을 수 없습니다.');

  // 1. 사용자가 업로드한 트랙 수집
  const allTracks = trackStore.getAllTracksIncludingDeleted();
  const userTracks = allTracks.filter(t => t.uploadedByUserId === userId);
  const userTrackIds = userTracks.map(t => t.id);

  // 2. 각 트랙에 연결된 데이터 정리 (트랙 삭제 전)
  for (const trackId of userTrackIds) {
    likedTrackStore.removeByTrackId(trackId);
    recentlyPlayedStore.removeByTrackId(trackId);
    playerSessionStore.removeTrackFromSessions(trackId);
    playlistStore.removeTrackFromAll(trackId);
    trackDeleteRequestStore.removeByTrackId(trackId);
  }

  // 3. 트랙 파일 및 레코드 삭제
  for (const track of userTracks) {
    if (track.audioKey) await safeDelete(track.audioKey);
    if (track.coverKey) await safeDelete(track.coverKey);
    trackStore.deleteTrack(track.id);
  }

  // 4. 사용자의 좋아요 기록 삭제
  const likedTracks = readJson('likedTracks.json');
  writeJson('likedTracks.json', likedTracks.filter(l => l.userId !== userId));

  // 5. 팔로우 기록 삭제: 내가 팔로우한 + 나를 팔로우한
  const follows = readJson('followedArtists.json');
  let remainingFollows = follows.filter(f => f.userId !== userId);
  if (user.artistName) {
    const normalized = user.artistName.toLowerCase();
    remainingFollows = remainingFollows.filter(f => f.artistName.toLowerCase() !== normalized);
  }
  writeJson('followedArtists.json', remainingFollows);

  // 6. 알림 삭제
  const notifications = readJson('notifications.json');
  writeJson('notifications.json', notifications.filter(n => n.userId !== userId));

  // 7. 최근 재생 기록 삭제
  const recentlyPlayed = readJson('recentlyPlayed.json');
  writeJson('recentlyPlayed.json', recentlyPlayed.filter(r => r.userId !== userId));

  // 8. 플레이어 세션 삭제
  const playerSessions = readJson('playerSessions.json');
  writeJson('playerSessions.json', playerSessions.filter(s => s.userId !== userId));

  // 9. 플레이리스트 전체 삭제 (기본 포함)
  const playlists = readJson('playlists.json');
  writeJson('playlists.json', playlists.filter(p => p.userId !== userId));

  // 10. 크리에이터 신청 기록 삭제
  const creatorRequests = readJson('creatorRequests.json');
  writeJson('creatorRequests.json', creatorRequests.filter(r => r.userId !== userId));

  // 11. 프로필 이미지 파일 삭제
  if (user.profileImageUrl) {
    try {
      const url = new URL(user.profileImageUrl);
      // "/uploads/profiles/xxx.jpg" → "profiles/xxx.jpg"
      const key = url.pathname.replace(/^\/uploads\//, '');
      if (key && key.startsWith('profiles/')) await safeDelete(key);
    } catch {}
  }

  // 12. 사용자 계정 삭제
  const users = readJson('users.json');
  writeJson('users.json', users.filter(u => u.id !== userId));
}

module.exports = { deleteUserAccount };
