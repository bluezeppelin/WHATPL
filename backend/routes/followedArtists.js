const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/authMiddleware');
const { findByUserAndArtist, getFollowedByUser, getFollowersByArtistName, addFollow, removeFollow } = require('../lib/followedArtistStore');
const { findById, getAllUsers } = require('../lib/userStore');
const notificationStore = require('../lib/notificationStore');

const router = express.Router();

// GET /api/followed-artists/me — 내 팔로우 아티스트 목록
router.get('/me', requireAuth, async (req, res) => {
  try {
    const follows = (await getFollowedByUser(req.user.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ followedArtists: follows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/followed-artists/my-followers — 나를 구독하는 사용자 목록 (creator용)
router.get('/my-followers', requireAuth, async (req, res) => {
  try {
    const artistName = req.user.artistName;
    if (!artistName) return res.json({ followers: [], total: 0 });
    const follows = (await getFollowersByArtistName(artistName))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const followers = await Promise.all(follows.map(async f => {
      const u = await findById(f.userId);
      return { id: f.id, userId: f.userId, name: u?.name || '알 수 없음', subscribedAt: f.createdAt };
    }));
    res.json({ followers, total: followers.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/followed-artists/:artistName — 팔로우 상태 확인
router.get('/:artistName', requireAuth, async (req, res) => {
  try {
    const artistName = decodeURIComponent(req.params.artistName);
    if (!artistName?.trim()) return res.status(400).json({ error: '아티스트명이 필요합니다.' });
    const record = await findByUserAndArtist(req.user.id, artistName);
    res.json({ following: !!record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/followed-artists/:artistName — 팔로우 추가
router.post('/:artistName', requireAuth, async (req, res) => {
  try {
    const artistName = decodeURIComponent(req.params.artistName).trim();
    if (!artistName) return res.status(400).json({ error: '아티스트명이 필요합니다.' });

    const existing = await findByUserAndArtist(req.user.id, artistName);
    if (existing) return res.json({ message: '이미 팔로우한 아티스트입니다.', following: true });

    await addFollow({
      id: uuidv4(),
      userId: req.user.id,
      artistName,
      createdAt: new Date().toISOString(),
    });

    // 해당 artistName의 creator 유저에게 알림
    try {
      const normalized = artistName.toLowerCase();
      const allUsers = await getAllUsers();
      const creator = allUsers.find(u => u.artistName?.toLowerCase() === normalized);
      if (creator && creator.id !== req.user.id) {
        await notificationStore.createNotification({
          userId: creator.id,
          type: 'new_follower',
          title: '새 구독자',
          message: `${req.user.name}님이 나를 구독했습니다.`,
          link: '/my-sound?tab=follow',
        });
      }
    } catch {}

    res.status(201).json({ message: '아티스트를 팔로우했습니다.', following: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// DELETE /api/followed-artists/:artistName — 팔로우 취소
router.delete('/:artistName', requireAuth, async (req, res) => {
  try {
    const artistName = decodeURIComponent(req.params.artistName).trim();
    if (!artistName) return res.status(400).json({ error: '아티스트명이 필요합니다.' });
    await removeFollow(req.user.id, artistName);
    res.json({ message: '아티스트 팔로우를 취소했습니다.', following: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
