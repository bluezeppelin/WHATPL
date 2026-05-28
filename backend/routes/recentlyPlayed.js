const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getTrackById } = require('../lib/store');
const { addOrUpdate, getByUser } = require('../lib/recentlyPlayedStore');

// GET /api/recently-played/me — 내 최근 들은 곡 조회
router.get('/me', requireAuth, async (req, res) => {
  try {
    const records = await getByUser(req.user.id);
    const tracks = [];
    for (const r of records) {
      const track = await getTrackById(r.trackId);
      if (track && track.status !== 'deleted' && track.status !== 'suspended') {
        tracks.push({ ...track, playedAt: r.playedAt });
      }
    }
    res.json({ tracks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/recently-played/:trackId — 최근 들은 곡 추가/갱신
router.post('/:trackId', requireAuth, async (req, res) => {
  try {
    const { trackId } = req.params;
    const track = await getTrackById(trackId);
    if (!track || track.status === 'deleted' || track.status === 'suspended') {
      return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
    }
    const record = await addOrUpdate(req.user.id, trackId);
    res.json({ message: '최근 들은 곡에 추가되었습니다.', recentlyPlayed: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
