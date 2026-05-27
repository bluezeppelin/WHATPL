const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getTrackById } = require('../lib/store');
const { addOrUpdate, getByUser } = require('../lib/recentlyPlayedStore');

// GET /api/recently-played/me — 내 최근 들은 곡 조회
router.get('/me', requireAuth, (req, res) => {
  const records = getByUser(req.user.id);
  const tracks = records.reduce((acc, r) => {
    const track = getTrackById(r.trackId);
    if (track && track.status !== 'deleted' && track.status !== 'suspended') {
      acc.push({ ...track, playedAt: r.playedAt });
    }
    return acc;
  }, []);
  res.json({ tracks });
});

// POST /api/recently-played/:trackId — 최근 들은 곡 추가/갱신
router.post('/:trackId', requireAuth, (req, res) => {
  const { trackId } = req.params;
  const track = getTrackById(trackId);
  if (!track || track.status === 'deleted' || track.status === 'suspended') {
    return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
  }
  const record = addOrUpdate(req.user.id, trackId);
  res.json({ message: '최근 들은 곡에 추가되었습니다.', recentlyPlayed: record });
});

module.exports = router;
