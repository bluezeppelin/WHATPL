const express = require('express');
const router = express.Router();
const { upload, getFileUrl, deleteFromS3 } = require('../lib/s3');
const store = require('../lib/store');
const { removeTrackFromAll } = require('../lib/playlistStore');
const { requireAuth } = require('../middleware/authMiddleware');
const recentlyPlayedStore = require('../lib/recentlyPlayedStore');
const { getFollowersByArtistName } = require('../lib/followedArtistStore');
const notificationStore = require('../lib/notificationStore');
const { getAllLikeCounts } = require('../lib/likedTrackStore');

function requireUploader(req, res, next) {
  if (req.user.role !== 'creator') {
    return res.status(403).json({ error: 'Creator 회원만 음원을 업로드할 수 있습니다. 관리자 계정은 관리자 콘솔을 사용해주세요.' });
  }
  next();
}

// 트랙 목록 조회
router.get('/', (req, res) => {
  const { genre, search } = req.query;
  let tracks = store.getAllTracks();

  if (genre) {
    tracks = tracks.filter(t => t.genre.toLowerCase() === genre.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    tracks = tracks.filter(t =>
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }

  res.json(tracks);
});

// 최근 N일 인기 트랙 — /:id보다 반드시 먼저 정의해야 라우팅 충돌 없음
// GET /api/tracks/trending?range=7d&limit=8
router.get('/trending', (req, res) => {
  const days  = parseInt(req.query.range) || 7;  // "7d" → 7
  const limit = parseInt(req.query.limit) || 8;

  // 최근 days일 집계 (MySQL 전환 시 getTrendingTrackCounts만 교체)
  const trendingCounts = recentlyPlayedStore.getTrendingTrackCounts(days);

  let tracks;
  let fallback = false;

  if (trendingCounts.length > 0) {
    const activeTracks = store.getAllTracks(); // deleted/suspended 자동 제외
    const trackMap = new Map(activeTracks.map(t => [t.id, t]));

    tracks = trendingCounts
      .map(({ trackId, count }) => {
        const track = trackMap.get(trackId);
        if (!track) return null; // 하드삭제된 트랙 제외
        return { ...track, recentPlayCount: count };
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  // fallback: 최근 재생 기록이 없으면 누적 plays 기준으로 반환
  if (!tracks || tracks.length === 0) {
    fallback = true;
    tracks = store.getAllTracks()
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, limit)
      .map(t => ({ ...t, recentPlayCount: null }));
  }

  res.json({ tracks, meta: { range: `${days}d`, fallback } });
});

// 좋아요 누적순 정렬 — /:id보다 먼저 정의
// GET /api/tracks/top-liked?limit=8
router.get('/top-liked', (req, res) => {
  const limit = parseInt(req.query.limit) || 8;
  const counts = getAllLikeCounts();
  const activeTracks = store.getAllTracks(); // deleted/suspended 자동 제외

  const tracks = activeTracks
    .map(t => ({ ...t, likeCount: counts[t.id] || 0 }))
    .sort((a, b) => (b.likeCount - a.likeCount) || (new Date(b.createdAt) - new Date(a.createdAt)))
    .slice(0, limit);

  res.json({ tracks });
});

// 단일 트랙 조회
router.get('/:id', (req, res) => {
  const track = store.getTrackById(req.params.id);
  if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
  res.json(track);
});

// 트랙 업로드
router.post(
  '/',
  requireAuth,
  requireUploader,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const audioFile = req.files?.audio?.[0];
      const coverFile = req.files?.cover?.[0];

      if (!audioFile) {
        return res.status(400).json({ error: '오디오 파일이 필요합니다.' });
      }

      const artistName = req.user.artistName?.trim();
      if (!artistName) {
        return res.status(400).json({ error: '아티스트명이 프로필에 등록되어 있지 않습니다. 마이페이지에서 먼저 등록해주세요.' });
      }

      const { title, genre, description } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ error: '트랙 제목이 필요합니다.' });
      }

      const audioUrl = getFileUrl(audioFile.key);
      const coverUrl = coverFile ? getFileUrl(coverFile.key) : null;

      const track = store.createTrack({
        title: title.trim(),
        artist: artistName,
        genre: genre?.trim(),
        description: description?.trim(),
        audioUrl,
        audioKey: audioFile.key,
        coverUrl,
        coverKey: coverFile?.key || null,
        duration: 0,
        uploadedByUserId: req.user.id,
      });

      res.status(201).json(track);

      // 업로드 성공 후 구독자 알림 (실패해도 업로드 자체에 영향 없음)
      try {
        const followers = getFollowersByArtistName(track.artist);
        if (followers.length > 0) {
          notificationStore.createBulkNotifications(
            followers.map(f => f.userId),
            {
              type: 'creator_new_track',
              title: '새 음원 업로드',
              message: `${track.artist}님이 새 음원 '${track.title}'을 업로드했습니다.`,
              link: `/tracks/${track.id}`,
            }
          );
        }
      } catch (err) {
        console.error('구독자 알림 발송 실패:', err);
      }
    } catch (err) {
      console.error('업로드 오류:', err);
      res.status(500).json({ error: '업로드에 실패했습니다.' });
    }
  }
);

// 트랙 정보 수정
router.patch(
  '/:id',
  requireAuth,
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    const existing = store.getTrackById(req.params.id);
    if (!existing) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

    const { role, id: userId } = req.user;
    if (role === 'user') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    if (role === 'creator' && existing.uploadedByUserId !== userId) {
      return res.status(403).json({ error: '본인이 업로드한 트랙만 수정할 수 있습니다.' });
    }

    const { title, artist, genre, description } = req.body;
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ error: '제목은 비워둘 수 없습니다.' });
    }

    const updates = {};
    if (title !== undefined)       updates.title       = title.trim();
    if (artist !== undefined)      updates.artist      = artist.trim() || '알 수 없는 아티스트';
    if (genre !== undefined)       updates.genre       = genre.trim();
    if (description !== undefined) updates.description = description.trim();

    const coverFile = req.files?.cover?.[0];
    if (coverFile) {
      // 기존 커버 파일 삭제
      if (existing.coverKey) {
        try { await deleteFromS3(existing.coverKey); } catch {}
      }
      updates.coverUrl = getFileUrl(coverFile.key);
      updates.coverKey = coverFile.key;
    }

    const updated = store.updateTrack(req.params.id, updates);
    res.json(updated);
  }
);

// 재생수 증가 — 어뷰징 방지: 인증 필수 + 같은 (userId, trackId) 30초 throttle
const playThrottle = new Map(); // key: "userId:trackId", value: lastTimestamp (ms)
const PLAY_THROTTLE_MS = 30 * 1000;

// 메모리 누수 방지: 1시간마다 1시간 이상 된 entry 제거
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, ts] of playThrottle) {
    if (ts < cutoff) playThrottle.delete(key);
  }
}, 60 * 60 * 1000).unref?.();

router.post('/:id/play', requireAuth, (req, res) => {
  const track = store.getTrackById(req.params.id);
  if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

  const key = `${req.user.id}:${req.params.id}`;
  const last = playThrottle.get(key) || 0;
  const now = Date.now();
  if (now - last < PLAY_THROTTLE_MS) {
    return res.json({ plays: track.plays, throttled: true });
  }
  playThrottle.set(key, now);

  store.incrementPlays(req.params.id);
  res.json({ plays: track.plays + 1 });
});

// 트랙 삭제
router.delete('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자만 트랙을 삭제할 수 있습니다.' });
  }
  const track = store.deleteTrack(req.params.id);
  if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

  // 모든 플레이리스트에서 해당 트랙 제거
  removeTrackFromAll(track.id);

  try {
    if (track.audioKey) await deleteFromS3(track.audioKey);
    if (track.coverKey) await deleteFromS3(track.coverKey);
  } catch (err) {
    console.error('S3 삭제 오류:', err);
  }

  res.json({ message: '삭제되었습니다.' });
});

module.exports = router;
