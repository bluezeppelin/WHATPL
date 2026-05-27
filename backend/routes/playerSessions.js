const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getTrackById } = require('../lib/store');
const { upsert, getByUser } = require('../lib/playerSessionStore');

// GET /api/player-session/me — 마지막 재생 상태 조회
router.get('/me', requireAuth, (req, res) => {
  const session = getByUser(req.user.id);
  if (!session) return res.json({ session: null });

  let track = null;
  if (session.trackId) {
    const t = getTrackById(session.trackId);
    if (t && t.status !== 'deleted' && t.status !== 'suspended') track = t;
  }
  if (!track) return res.json({ session: null });

  const queueTracks = (session.queueTrackIds || []).reduce((acc, id) => {
    const qt = getTrackById(id);
    if (qt && qt.status !== 'deleted' && qt.status !== 'suspended') acc.push(qt);
    return acc;
  }, []);

  res.json({
    session: {
      trackId: session.trackId,
      currentTime: session.currentTime || 0,
      currentIndex: session.currentIndex ?? -1,
      queueType: session.queueType || 'allTracks',
      queueSourceId: session.queueSourceId || null,
      repeatMode: session.repeatMode || 'none',
      shuffle: session.shuffle || false,
      track,
      queueTracks,
    }
  });
});

// PUT /api/player-session — 마지막 재생 상태 저장
router.put('/', requireAuth, (req, res) => {
  const { trackId, currentTime, queueTrackIds, currentIndex, queueType, queueSourceId, repeatMode, shuffle } = req.body;
  const updated = upsert(req.user.id, {
    trackId,
    currentTime: currentTime || 0,
    queueTrackIds: queueTrackIds || [],
    currentIndex: currentIndex ?? -1,
    queueType: queueType || 'allTracks',
    queueSourceId: queueSourceId || null,
    repeatMode: repeatMode || 'none',
    shuffle: shuffle || false,
  });
  res.json({ session: updated });
});

module.exports = router;
