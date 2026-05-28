const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getTrackById } = require('../lib/store');
const { upsert, getByUser } = require('../lib/playerSessionStore');

// GET /api/player-session/me — 마지막 재생 상태 조회
router.get('/me', requireAuth, async (req, res) => {
  try {
    const session = await getByUser(req.user.id);
    if (!session) return res.json({ session: null });

    let track = null;
    if (session.trackId) {
      const t = await getTrackById(session.trackId);
      if (t && t.status !== 'deleted' && t.status !== 'suspended') track = t;
    }
    if (!track) return res.json({ session: null });

    const queueTracks = [];
    for (const id of (session.queueTrackIds || [])) {
      const qt = await getTrackById(id);
      if (qt && qt.status !== 'deleted' && qt.status !== 'suspended') queueTracks.push(qt);
    }

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

async function isActiveTrackId(trackId) {
  if (!trackId) return false;
  const track = await getTrackById(trackId);
  return !!track && track.status === 'active';
}

// PUT /api/player-session — 마지막 재생 상태 저장
router.put('/', requireAuth, async (req, res) => {
  try {
    const { trackId, currentTime, queueTrackIds, currentIndex, queueType, queueSourceId, repeatMode, shuffle } = req.body;

    const sanitizedQueueTrackIds = [];
    if (Array.isArray(queueTrackIds)) {
      for (const id of queueTrackIds) {
        if (await isActiveTrackId(id)) sanitizedQueueTrackIds.push(id);
      }
    }

    const sanitizedTrackId = await isActiveTrackId(trackId) ? trackId : null;
    const updated = await upsert(req.user.id, {
      trackId: sanitizedTrackId,
      currentTime: currentTime || 0,
      queueTrackIds: sanitizedQueueTrackIds,
      currentIndex: sanitizedTrackId ? (currentIndex ?? -1) : -1,
      queueType: queueType || 'allTracks',
      queueSourceId: queueSourceId || null,
      repeatMode: repeatMode || 'none',
      shuffle: shuffle || false,
    });
    res.json({ session: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
