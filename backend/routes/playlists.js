const express = require('express');
const router = express.Router();
const ps = require('../lib/playlistStore');
const store = require('../lib/store');
const { requireAuth } = require('../middleware/authMiddleware');

function hydrate(trackIds) {
  return trackIds.map(id => store.getTrackById(id)).filter(Boolean);
}

// id '0'을 요청하면 현재 유저의 실제 기본 재생목록으로 해석
function resolvePlaylist(userId, idParam) {
  if (idParam === '0') return ps.ensureDefaultPlaylist(userId);
  return ps.getPlaylistById(idParam);
}

// 내 플레이리스트 목록 (기본 재생목록 포함)
router.get('/', requireAuth, (req, res) => {
  ps.ensureDefaultPlaylist(req.user.id); // 기본 재생목록 없으면 생성
  const playlists = ps.getPlaylistsByUserId(req.user.id).map(p => ({
    ...p,
    trackCount: p.trackIds.length,
    covers: hydrate(p.trackIds.slice(0, 4)).map(t => t.coverUrl).filter(Boolean),
  }));
  res.json(playlists);
});

// 단일 플레이리스트 (소유자만)
router.get('/:id', requireAuth, (req, res) => {
  const p = resolvePlaylist(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
  if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
  res.json({ ...p, tracks: hydrate(p.trackIds) });
});

// 새 플레이리스트 생성
router.post('/', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: '이름이 필요합니다.' });
  res.status(201).json(ps.createPlaylist(name, req.user.id));
});

// 이름 변경 (소유자만, 기본 재생목록 제외)
router.patch('/:id', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: '이름이 필요합니다.' });
  const p = resolvePlaylist(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
  if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
  res.json(ps.renamePlaylist(p.id, name));
});

// 삭제 (소유자만, 기본 재생목록 보호)
router.delete('/:id', requireAuth, (req, res) => {
  const p = resolvePlaylist(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
  if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
  const removed = ps.deletePlaylist(p.id);
  if (!removed) return res.status(400).json({ error: '삭제할 수 없습니다.' });
  res.json({ message: '삭제되었습니다.' });
});

// 트랙 추가 (소유자만)
router.post('/:id/tracks', requireAuth, (req, res) => {
  const { trackId } = req.body;
  if (!trackId) return res.status(400).json({ error: 'trackId가 필요합니다.' });
  if (!store.getTrackById(trackId)) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
  const p = resolvePlaylist(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
  if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
  const result = ps.addTrack(p.id, trackId);
  if (result?.alreadyExists) return res.status(409).json({ error: '이미 플레이리스트에 있는 트랙입니다.' });
  res.json(result);
});

// 트랙 ID로 제거 - 첫 번째 일치 항목 (인덱스 경쟁 조건 방지, 소유자만)
router.delete('/:id/tracks/by-id/:trackId', requireAuth, (req, res) => {
  const p = resolvePlaylist(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
  if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
  const updated = ps.removeTrackFirstById(p.id, req.params.trackId);
  if (!updated) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
  res.json(updated);
});

// 트랙 인덱스로 제거 (소유자만, 하위 호환용)
router.delete('/:id/tracks/at/:index', requireAuth, (req, res) => {
  const index = parseInt(req.params.index);
  if (isNaN(index)) return res.status(400).json({ error: '유효하지 않은 인덱스입니다.' });
  const p = resolvePlaylist(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
  if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
  const updated = ps.removeTrackAt(p.id, index);
  if (!updated) return res.status(404).json({ error: '인덱스를 찾을 수 없습니다.' });
  res.json(updated);
});

// 전체 트랙 목록 교체 (대기열 동기화용, 소유자만)
router.put('/:id/tracks', requireAuth, (req, res) => {
  const { trackIds } = req.body;
  if (!Array.isArray(trackIds)) return res.status(400).json({ error: 'trackIds 배열이 필요합니다.' });
  const p = resolvePlaylist(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
  if (!ps.isOwnedBy(p, req.user.id)) return res.status(403).json({ error: '접근 권한이 없습니다.' });
  res.json(ps.setTracks(p.id, trackIds));
});

module.exports = router;
