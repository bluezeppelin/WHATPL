'use strict';

const db = require('./db');
const { deleteFromS3 } = require('./s3');
const trackStore = require('./store');
const { cleanupTrackForHardDelete } = require('./trackReferenceCleanup');
const userStore = require('./userStore');

async function safeDelete(key) {
  try { await deleteFromS3(key); } catch {}
}

async function deleteUserAccount(userId) {
  const user = await userStore.findById(userId);
  if (!user) throw new Error('사용자를 찾을 수 없습니다.');

  // creator 탈퇴 시 다른 사용자가 해당 artistName을 구독한 문자열 기반 기록도 제거
  if (user.artistName?.trim()) {
    await db.execute(
      `DELETE FROM followed_artists WHERE LOWER(artist_name) = LOWER(?)`,
      [user.artistName.trim()]
    );
  }

  // 해당 유저의 트랙 수집
  const allTracks = await trackStore.getAllTracksIncludingDeleted();
  const userTracks = allTracks.filter(t => t.uploadedByUserId === userId);

  // 트랙별 연관 데이터 정리 (CASCADE로 처리 안 되는 것들)
  for (const track of userTracks) {
    await cleanupTrackForHardDelete(track.id);
    // S3 파일 삭제
    if (track.audioKey) await safeDelete(track.audioKey);
    if (track.coverKey) await safeDelete(track.coverKey);
  }

  // 프로필 이미지 S3 삭제
  if (user.profileImageUrl) {
    try {
      const url = new URL(user.profileImageUrl);
      // S3 URL에서 key 추출: /profiles/xxx.jpg → profiles/xxx.jpg
      const key = url.pathname.replace(/^\//, '');
      if (key.startsWith('profiles/')) await safeDelete(key);
    } catch {}
  }

  // users 레코드 삭제
  // ON DELETE CASCADE로 liked_tracks, followed_artists, notifications,
  // recently_played, player_sessions, playlists, creator_requests 자동 삭제
  // tracks는 SET NULL이므로 별도 삭제
  await db.execute(`DELETE FROM tracks WHERE uploaded_by_user_id = ?`, [userId]);
  await db.execute(`DELETE FROM users WHERE id = ?`, [userId]);
}

module.exports = { deleteUserAccount };
