const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/authMiddleware');
const { findByUserAndTrack, getLikedByUser, addLike, removeLike } = require('../lib/likedTrackStore');
const store = require('../lib/store');

const router = express.Router();

// GET /api/likes/me — 내가 좋아요한 트랙 목록
router.get('/me', requireAuth, async (req, res) => {
  try {
    const records = await getLikedByUser(req.user.id);
    const allTracks = await store.getAllTracks();

    const likedTracks = records
      .map(r => {
        const track = allTracks.find(t => t.id === r.trackId);
        if (!track) return null;
        return { ...track, likedAt: r.createdAt };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));

    res.json({ likedTracks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/likes/:trackId — 특정 트랙 좋아요 상태
router.get('/:trackId', requireAuth, async (req, res) => {
  try {
    const record = await findByUserAndTrack(req.user.id, req.params.trackId);
    res.json({ liked: !!record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/likes/:trackId — 좋아요 추가
router.post('/:trackId', requireAuth, async (req, res) => {
  try {
    const track = await store.getTrackById(req.params.trackId);
    if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

    const existing = await findByUserAndTrack(req.user.id, req.params.trackId);
    if (existing) return res.json({ message: '이미 좋아요한 트랙입니다.', liked: true });

    await addLike({
      id: uuidv4(),
      userId: req.user.id,
      trackId: req.params.trackId,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: '좋아요가 추가되었습니다.', liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// DELETE /api/likes/:trackId — 좋아요 취소
router.delete('/:trackId', requireAuth, async (req, res) => {
  try {
    await removeLike(req.user.id, req.params.trackId);
    res.json({ message: '좋아요가 취소되었습니다.', liked: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
