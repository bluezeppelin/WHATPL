const express = require('express');
const router = express.Router();
const ps = require('../lib/playlistStore');
const store = require('../lib/store');
const { requireAuth } = require('../middleware/authMiddleware');

async function hydrate(trackIds) {
  const tracks = await Promise.all(trackIds.map(id => store.getTrackById(id)));
  return tracks.filter(t => t && t.status === 'active');
}

// id '0'을 요청하면 현재 유저의 실제 기본 재생목록으로 해석
async function resolvePlaylist(userId, idParam) {
  if (idParam === '0') return ps.ensureDefaultPlaylist(userId);
  return ps.getPlaylistById(idParam);
}

// 내 플레이리스트 목록 (기본 재생목록 포함)
router.get('/', requireAuth, async (req, res) => {
  try {
    await ps.ensureDefaultPlaylist(req.user.id);
    const rawPlaylists = await ps.getPlaylistsByUserId(req.user.id);
    const playlists = await Promise.all(rawPlaylists.map(async p => {
      const coverTracks = await hydrate(p.trackIds.slice(0, 4));
      return {
        ...p,
        trackCount: p.trackIds.length,
        covers: coverTracks.map(t => t.coverUrl).filter(Boolean),
      };
    }));
    res.json(playlists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 단일 플레이리스트 (소유자만)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const p = await resolvePlaylist(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    res.json({ ...p, tracks: await hydrate(p.trackIds) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 새 플레이리스트 생성
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '이름이 필요합니다.' });
    res.status(201).json(await ps.createPlaylist(name, req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 이름 변경 (소유자만, 기본 재생목록 제외)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '이름이 필요합니다.' });
    const p = await resolvePlaylist(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    res.json(await ps.renamePlaylist(p.id, name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 삭제 (소유자만, 기본 재생목록 보호)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const p = await resolvePlaylist(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    const removed = await ps.deletePlaylist(p.id);
    if (!removed) return res.status(400).json({ error: '삭제할 수 없습니다.' });
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 트랙 추가 (소유자만)
router.post('/:id/tracks', requireAuth, async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId가 필요합니다.' });
    const track = await store.getTrackById(trackId);
    if (!track || track.status !== 'active') return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
    const p = await resolvePlaylist(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    const result = await ps.addTrack(p.id, trackId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 트랙 ID로 제거 - 첫 번째 일치 항목 (인덱스 경쟁 조건 방지, 소유자만)
router.delete('/:id/tracks/by-id/:trackId', requireAuth, async (req, res) => {
  try {
    const p = await resolvePlaylist(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    const updated = await ps.removeTrackFirstById(p.id, req.params.trackId);
    if (!updated) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 트랙 인덱스로 제거 (소유자만, 하위 호환용)
router.delete('/:id/tracks/at/:index', requireAuth, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (isNaN(index)) return res.status(400).json({ error: '유효하지 않은 인덱스입니다.' });
    const p = await resolvePlaylist(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    const updated = await ps.removeTrackAt(p.id, index);
    if (!updated) return res.status(404).json({ error: '인덱스를 찾을 수 없습니다.' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 전체 트랙 목록 교체 (대기열 동기화용, 소유자만)
router.put('/:id/tracks', requireAuth, async (req, res) => {
  try {
    const { trackIds } = req.body;
    if (!Array.isArray(trackIds)) return res.status(400).json({ error: 'trackIds 배열이 필요합니다.' });
    const p = await resolvePlaylist(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });

    const sanitizedTrackIds = [];
    for (const id of trackIds) {
      const track = await store.getTrackById(id);
      if (track && track.status === 'active') sanitizedTrackIds.push(id);
    }

    res.json(await ps.setTracks(p.id, sanitizedTrackIds));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
