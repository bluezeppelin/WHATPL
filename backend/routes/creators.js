const express = require('express');
const jwt = require('jsonwebtoken');
const { findById, getAllUsers } = require('../lib/userStore');
const { getAllTracksIncludingDeleted, getAllTracks } = require('../lib/store');
const { getFollowersByArtistName, findByUserAndArtist } = require('../lib/followedArtistStore');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/creators — active 크리에이터 목록 (구독자 수 기준 정렬)
router.get('/', (req, res) => {
  const users = getAllUsers().filter(
    u => u.role === 'creator' && (u.status || 'active') === 'active' && u.artistName
  );
  const allTracks = getAllTracks();

  const creators = users.map(u => {
    const tracks = allTracks.filter(t => t.uploadedByUserId === u.id);
    const followers = getFollowersByArtistName(u.artistName || '');
    return {
      id: u.id,
      artistName: u.artistName,
      profileImageUrl: u.profileImageUrl || null,
      trackCount: tracks.length,
      subscriberCount: followers.length,
    };
  }).sort((a, b) => b.subscriberCount - a.subscriberCount || b.trackCount - a.trackCount);

  res.json({ creators });
});

// GET /api/creators/:creatorId — 공개 프로필 + 트랙 목록
router.get('/:creatorId', (req, res) => {
  const { creatorId } = req.params;

  const user = findById(creatorId);
  if (!user || user.role !== 'creator' || user.status === 'inactive') {
    return res.status(404).json({ error: '크리에이터를 찾을 수 없습니다.' });
  }

  // active 트랙만 (deleted/suspended 제외)
  const tracks = getAllTracksIncludingDeleted()
    .filter(t => t.uploadedByUserId === creatorId && t.status !== 'deleted' && t.status !== 'suspended')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      genre: t.genre || '',
      coverUrl: t.coverUrl || '',
      audioUrl: t.audioUrl,
      audioKey: t.audioKey,
      duration: t.duration || 0,
      plays: t.plays || 0,
      likes: t.likes || 0,
      uploadedByUserId: t.uploadedByUserId,
      createdAt: t.createdAt,
    }));

  const subscribers = getFollowersByArtistName(user.artistName || '');

  // 선택적 인증 — 토큰 있으면 isSubscribed 계산
  let isSubscribed = false;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      const requester = findById(payload.id);
      if (requester && user.artistName) {
        isSubscribed = !!findByUserAndArtist(requester.id, user.artistName);
      }
    } catch {
      // 토큰 무효 → isSubscribed = false 유지
    }
  }

  return res.json({
    creator: {
      id: user.id,
      artistName: user.artistName || '',
      profileImageUrl: user.profileImageUrl || '',
      subscriberCount: subscribers.length,
      trackCount: tracks.length,
    },
    tracks,
    isSubscribed,
  });
});

module.exports = router;
