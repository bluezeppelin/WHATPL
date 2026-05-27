const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/authMiddleware');
const { findByUserAndArtist, getFollowedByUser, getFollowersByArtistName, addFollow, removeFollow } = require('../lib/followedArtistStore');
const { findById, getAllUsers } = require('../lib/userStore');
const notificationStore = require('../lib/notificationStore');

const router = express.Router();

// GET /api/followed-artists/me — 내 팔로우 아티스트 목록
router.get('/me', requireAuth, (req, res) => {
  const follows = getFollowedByUser(req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ followedArtists: follows });
});

// GET /api/followed-artists/my-followers — 나를 구독하는 사용자 목록 (creator용)
router.get('/my-followers', requireAuth, (req, res) => {
  const artistName = req.user.artistName;
  if (!artistName) return res.json({ followers: [], total: 0 });
  const follows = getFollowersByArtistName(artistName)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const followers = follows.map(f => {
    const u = findById(f.userId);
    return { id: f.id, userId: f.userId, name: u?.name || '알 수 없음', subscribedAt: f.createdAt };
  });
  res.json({ followers, total: followers.length });
});

// GET /api/followed-artists/:artistName — 팔로우 상태 확인
router.get('/:artistName', requireAuth, (req, res) => {
  const artistName = decodeURIComponent(req.params.artistName);
  if (!artistName?.trim()) return res.status(400).json({ error: '아티스트명이 필요합니다.' });
  const record = findByUserAndArtist(req.user.id, artistName);
  res.json({ following: !!record });
});

// POST /api/followed-artists/:artistName — 팔로우 추가
router.post('/:artistName', requireAuth, (req, res) => {
  const artistName = decodeURIComponent(req.params.artistName).trim();
  if (!artistName) return res.status(400).json({ error: '아티스트명이 필요합니다.' });

  const existing = findByUserAndArtist(req.user.id, artistName);
  if (existing) return res.json({ message: '이미 팔로우한 아티스트입니다.', following: true });

  addFollow({
    id: uuidv4(),
    userId: req.user.id,
    artistName,
    createdAt: new Date().toISOString(),
  });

  // 해당 artistName의 creator 유저에게 알림
  try {
    const normalized = artistName.toLowerCase();
    const creator = getAllUsers().find(u => u.artistName?.toLowerCase() === normalized);
    if (creator && creator.id !== req.user.id) {
      notificationStore.createNotification({
        userId: creator.id,
        type: 'new_follower',
        title: '새 구독자',
        message: `${req.user.name}님이 나를 구독했습니다.`,
        link: '/my-sound?tab=follow',
      });
    }
  } catch {}

  res.status(201).json({ message: '아티스트를 팔로우했습니다.', following: true });
});

// DELETE /api/followed-artists/:artistName — 팔로우 취소
router.delete('/:artistName', requireAuth, (req, res) => {
  const artistName = decodeURIComponent(req.params.artistName).trim();
  if (!artistName) return res.status(400).json({ error: '아티스트명이 필요합니다.' });
  removeFollow(req.user.id, artistName);
  res.json({ message: '아티스트 팔로우를 취소했습니다.', following: false });
});

module.exports = router;
