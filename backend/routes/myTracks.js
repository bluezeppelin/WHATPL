const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const store = require('../lib/store');
const deleteReqStore = require('../lib/trackDeleteRequestStore');

function requireCreator(req, res, next) {
  if (req.user.role !== 'creator') {
    return res.status(403).json({ error: 'Creator 회원만 사용할 수 있습니다.' });
  }
  next();
}

// 내 업로드 트랙 목록 (deleted 포함)
router.get('/tracks', requireAuth, requireCreator, async (req, res) => {
  try {
    const all = await store.getAllTracksIncludingDeleted();
    const myTracks = all.filter(t => t.uploadedByUserId === req.user.id);
    res.json({ tracks: myTracks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 내 음원 정보 수정
router.patch('/tracks/:trackId', requireAuth, requireCreator, async (req, res) => {
  try {
    const track = await store.getTrackById(req.params.trackId);
    if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
    if (track.uploadedByUserId !== req.user.id) {
      return res.status(403).json({ error: '본인이 업로드한 음원만 수정할 수 있습니다.' });
    }
    if (track.status === 'deleted') {
      return res.status(400).json({ error: '삭제된 음원은 수정할 수 없습니다.' });
    }

    // artistName/artist/audioUrl/status 등 민감 필드는 절대 수정하지 않음
    const { title, genre, description, coverUrl } = req.body;
    const updates = {};
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: '제목은 비워둘 수 없습니다.' });
      updates.title = title.trim();
    }
    if (genre !== undefined) updates.genre = genre.trim();
    if (description !== undefined) updates.description = description.trim();
    if (coverUrl !== undefined) updates.coverUrl = coverUrl.trim();

    const updated = await store.updateTrack(req.params.trackId, updates);
    res.json({ message: '음원 정보가 수정되었습니다.', track: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 삭제 요청 생성
router.post('/tracks/:trackId/delete-request', requireAuth, requireCreator, async (req, res) => {
  try {
    const track = await store.getTrackById(req.params.trackId);
    if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
    if (track.uploadedByUserId !== req.user.id) {
      return res.status(403).json({ error: '본인이 업로드한 음원만 삭제 요청할 수 있습니다.' });
    }
    if (track.status === 'deleted') {
      return res.status(400).json({ error: '이미 삭제된 음원입니다.' });
    }
    if (await deleteReqStore.findPendingByTrackId(track.id)) {
      return res.status(409).json({ error: '이미 대기 중인 삭제 요청이 있습니다.' });
    }

    const { reason } = req.body;
    const request = await deleteReqStore.create({
      trackId: track.id,
      creatorUserId: req.user.id,
      creatorLoginId: req.user.loginId,
      artistName: req.user.artistName || '',
      trackTitle: track.title,
      reason: reason || '',
    });

    res.status(201).json({ message: '삭제 요청이 접수되었습니다.', request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 내 삭제 요청 목록 조회
router.get('/track-delete-requests', requireAuth, requireCreator, async (req, res) => {
  try {
    const requests = await deleteReqStore.getByCreatorUserId(req.user.id);
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
