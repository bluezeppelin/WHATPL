const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { requireAuth, requireAdminReauth, JWT_SECRET } = require('../middleware/authMiddleware');
const { getAllTracksIncludingDeleted, getTrackById, updateTrack, deleteTrack, softDeleteTrack, suspendTracksByUser, restoreTracksByUser } = require('../lib/store');
const { removeTrackFromAll } = require('../lib/playlistStore');
const { removeByTrackId: removeLikesByTrackId } = require('../lib/likedTrackStore');
const recentlyPlayedStore = require('../lib/recentlyPlayedStore');
const playerSessionStore = require('../lib/playerSessionStore');
const trackDeleteReqStore = require('../lib/trackDeleteRequestStore');
const hardDeleteLogStore = require('../lib/hardDeleteLogStore');
const { getAllUsers, findById: findUserById, updateUser, sanitize: sanitizeUser } = require('../lib/userStore');
const { getSiteSettings, updateTheme, updateLogo, updateHeroBackground, validateHexColor } = require('../lib/siteSettingsStore');
const notificationStore = require('../lib/notificationStore');

const AUDIO_DIR = path.join(__dirname, '..', 'uploads', 'audio');
const COVERS_DIR = path.join(__dirname, '..', 'uploads', 'covers');

function safeUnlink(filePath) {
  try { fs.unlinkSync(filePath); }
  catch (err) {
    // 파일 없음(ENOENT)은 이미 지워진 정상 케이스 — 그 외 에러는 로깅
    if (err && err.code !== 'ENOENT') {
      console.error('[safeUnlink] 파일 삭제 실패:', filePath, err.code || err.message);
    }
  }
}

function hardDeleteTrackCompletely(track, deletedBy) {
  const trackId = track.id;

  // 0. 영구 삭제 로그 먼저 기록 — 로그 실패 시 throw → 데이터 삭제는 진행되지 않음
  hardDeleteLogStore.addLog({
    trackId,
    title: track.title,
    artist: track.artist,
    deletedBy: deletedBy || null,
    reason: `hard delete by admin (이전 상태: ${track.status || 'active'})`,
  });

  // 1. tracks.json에서 완전 제거
  deleteTrack(trackId);

  // 2. 오디오 파일 삭제
  if (track.audioKey) {
    safeUnlink(path.join(AUDIO_DIR, track.audioKey));
  } else if (track.audioUrl) {
    try {
      const filename = new URL(track.audioUrl).pathname.split('/').pop();
      if (filename) safeUnlink(path.join(AUDIO_DIR, filename));
    } catch {}
  }

  // 3. 커버 이미지 파일 삭제
  if (track.coverKey) {
    safeUnlink(path.join(COVERS_DIR, track.coverKey));
  } else if (track.coverUrl) {
    try {
      const filename = new URL(track.coverUrl).pathname.split('/').pop();
      if (filename) safeUnlink(path.join(COVERS_DIR, filename));
    } catch {}
  }

  // 4. 플레이리스트에서 제거
  removeTrackFromAll(trackId);

  // 5. 좋아요 기록 삭제
  removeLikesByTrackId(trackId);

  // 6. 최근 재생 기록 삭제
  recentlyPlayedStore.removeByTrackId(trackId);

  // 7. 플레이어 세션에서 제거
  playerSessionStore.removeTrackFromSessions(trackId);

  // 8. 삭제 요청 기록 삭제
  trackDeleteReqStore.removeByTrackId(trackId);
}

// 사이트 이미지 업로드 공용 디렉토리
const SITE_DIR = path.join(__dirname, '..', 'uploads', 'site');
if (!fs.existsSync(SITE_DIR)) fs.mkdirSync(SITE_DIR, { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, SITE_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `logo-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const heroBgUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, SITE_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `hero-bg-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
  }
  next();
}

// POST /api/admin/reauth — 관리자 2차 비밀번호 인증
router.post('/reauth', requireAuth, requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
  }
  const userWithHash = findUserById(req.user.id);
  if (!userWithHash) {
    return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
  }
  const valid = await bcrypt.compare(password, userWithHash.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
  const REAUTH_EXPIRES = 15 * 60;
  const adminReauthToken = jwt.sign(
    { id: req.user.id, role: req.user.role, purpose: 'admin_reauth' },
    JWT_SECRET,
    { expiresIn: REAUTH_EXPIRES }
  );
  res.json({ adminReauthToken, expiresIn: REAUTH_EXPIRES });
});

// 음원 목록 조회 (삭제된 트랙 포함)
router.get('/tracks', requireAuth, requireAdmin, (req, res) => {
  const tracks = getAllTracksIncludingDeleted();
  res.json({ tracks });
});

// 음원 정보 수정
router.patch('/tracks/:trackId', requireAuth, requireAdmin, (req, res) => {
  const track = getTrackById(req.params.trackId);
  if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

  const { title, artist, genre, description } = req.body;
  const updates = {};
  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ error: '제목은 비워둘 수 없습니다.' });
    updates.title = title.trim();
  }
  if (artist !== undefined) updates.artist = artist.trim() || track.artist;
  if (genre !== undefined) updates.genre = genre.trim();
  if (description !== undefined) updates.description = description.trim();

  const updated = updateTrack(req.params.trackId, updates);
  res.json(updated);
});

// 음원 소프트 삭제
router.delete('/tracks/:trackId', requireAuth, requireAdmin, (req, res) => {
  const { deleteReason } = req.body;
  const track = softDeleteTrack(req.params.trackId, req.user.loginId, deleteReason || '');
  if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

  // 플레이리스트·좋아요에서 참조 제거 (UI 오류 방지)
  removeTrackFromAll(track.id);
  removeLikesByTrackId(track.id);

  try {
    if (track.uploadedByUserId) {
      notificationStore.createNotification({
        userId: track.uploadedByUserId,
        type: 'track_removed_by_admin',
        title: '음원 처리 알림',
        message: `'${track.title}'이 관리자에 의해 삭제 처리되었습니다.`,
        link: '/mypage?tab=creator',
      });
    }
  } catch {}

  res.json({ message: '삭제되었습니다.', track });
});

// DELETE /api/admin/tracks/:id/hard — 영구 삭제 (관리자 + 재인증 토큰 필수)
router.delete('/tracks/:id/hard', requireAuth, requireAdmin, requireAdminReauth, (req, res) => {
  const track = getTrackById(req.params.id);
  if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

  if (track.status !== 'deleted') {
    return res.status(409).json({
      error: 'soft delete 처리된 음원만 영구 삭제할 수 있습니다. 먼저 관리자 삭제(soft delete)를 진행해주세요.',
    });
  }

  hardDeleteTrackCompletely(track, req.user.loginId);

  res.json({ message: '영구 삭제되었습니다.', trackId: track.id });
});

// 영구 삭제 로그 조회 (관리자 전용)
router.get('/hard-delete-logs', requireAuth, requireAdmin, (req, res) => {
  const logs = hardDeleteLogStore.getAll();
  res.json({ logs });
});

// 삭제 요청 목록 조회
router.get('/track-delete-requests', requireAuth, requireAdmin, (req, res) => {
  const { status } = req.query;
  const list = trackDeleteReqStore.getAll(status || null);
  res.json({ requests: list });
});

// 삭제 요청 승인 → 트랙 소프트 삭제 + 플레이리스트/좋아요 참조 제거
router.patch('/track-delete-requests/:id/approve', requireAuth, requireAdmin, (req, res) => {
  const deleteReq = trackDeleteReqStore.findById(req.params.id);
  if (!deleteReq) return res.status(404).json({ error: '삭제 요청을 찾을 수 없습니다.' });
  if (deleteReq.status !== 'pending') return res.status(409).json({ error: '이미 처리된 요청입니다.' });

  const track = softDeleteTrack(deleteReq.trackId, req.user.loginId, `삭제 요청 승인 (요청자: ${deleteReq.creatorLoginId})`);
  if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

  removeTrackFromAll(deleteReq.trackId);
  removeLikesByTrackId(deleteReq.trackId);

  const updated = trackDeleteReqStore.update(req.params.id, {
    status: 'approved',
    reviewedBy: req.user.loginId,
    reviewedAt: new Date().toISOString(),
  });

  try {
    if (track.uploadedByUserId) {
      notificationStore.createNotification({
        userId: track.uploadedByUserId,
        type: 'track_delete_approved',
        title: '삭제 요청 승인',
        message: `'${track.title}' 삭제 요청이 승인되었습니다.`,
        link: '/mypage?tab=creator',
      });
    }
  } catch {}

  res.json({ request: updated, track });
});

// 삭제 요청 반려
router.patch('/track-delete-requests/:id/reject', requireAuth, requireAdmin, (req, res) => {
  const deleteReq = trackDeleteReqStore.findById(req.params.id);
  if (!deleteReq) return res.status(404).json({ error: '삭제 요청을 찾을 수 없습니다.' });
  if (deleteReq.status !== 'pending') return res.status(409).json({ error: '이미 처리된 요청입니다.' });

  const { rejectReason } = req.body;
  const updated = trackDeleteReqStore.update(req.params.id, {
    status: 'rejected',
    reviewedBy: req.user.loginId,
    reviewedAt: new Date().toISOString(),
    rejectReason: rejectReason || '',
  });

  try {
    const rejectedTrack = getTrackById(deleteReq.trackId);
    if (rejectedTrack?.uploadedByUserId) {
      notificationStore.createNotification({
        userId: rejectedTrack.uploadedByUserId,
        type: 'track_delete_rejected',
        title: '삭제 요청 거절',
        message: `'${rejectedTrack.title}' 삭제 요청이 거절되었습니다.`,
        link: '/mypage?tab=creator',
      });
    }
  } catch {}

  res.json({ request: updated });
});

// 회원 목록 조회
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const { role, status } = req.query;
  const users = getAllUsers({ role: role || undefined, status: status || undefined }).map(sanitizeUser);
  res.json({ users });
});

// 회원 비활성화
router.patch('/users/:userId/deactivate', requireAuth, requireAdmin, (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.id) {
    return res.status(400).json({ error: '자기 자신을 비활성화할 수 없습니다.' });
  }
  const target = findUserById(userId);
  if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  if (target.role === 'admin') return res.status(403).json({ error: 'admin 계정은 비활성화할 수 없습니다.' });
  if ((target.status || 'active') === 'inactive') return res.status(409).json({ error: '이미 비활성화된 계정입니다.' });

  const updated = updateUser(userId, {
    status: 'inactive',
    deactivatedAt: new Date().toISOString(),
    deactivatedBy: req.user.id,
  });
  suspendTracksByUser(userId, req.user.loginId);

  try {
    notificationStore.createNotification({
      userId: target.id,
      type: 'account_status_changed',
      title: '계정 상태 변경',
      message: '계정이 관리자에 의해 비활성화되었습니다.',
      link: '/mypage',
    });
  } catch {}

  res.json({ message: '회원이 비활성화되었습니다.', user: sanitizeUser(updated) });
});

// 회원 활성화
router.patch('/users/:userId/activate', requireAuth, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const target = findUserById(userId);
  if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  if ((target.status || 'active') === 'active') return res.status(409).json({ error: '이미 활성화된 계정입니다.' });

  const updated = updateUser(userId, {
    status: 'active',
    deactivatedAt: null,
    deactivatedBy: null,
  });
  restoreTracksByUser(userId);

  try {
    notificationStore.createNotification({
      userId: target.id,
      type: 'account_status_changed',
      title: '계정 상태 변경',
      message: '계정이 관리자에 의해 다시 활성화되었습니다.',
      link: '/mypage',
    });
  } catch {}

  res.json({ message: '회원이 활성화되었습니다.', user: sanitizeUser(updated) });
});

// PATCH /api/admin/site-settings — 색상 4개 저장 (관리자 전용)
router.patch('/site-settings', requireAuth, requireAdmin, (req, res) => {
  const { mainColor, subColor1, subColor2, subColor3 } = req.body;
  const colors = { mainColor, subColor1, subColor2, subColor3 };

  for (const [key, val] of Object.entries(colors)) {
    if (val !== undefined && !validateHexColor(val)) {
      return res.status(400).json({ error: `${key}의 색상 형식이 올바르지 않습니다. (#RGB 또는 #RRGGBB 형식만 허용)` });
    }
  }

  const updated = updateTheme(colors);
  res.json(updated);
});

// POST /api/admin/site-settings/logo — 로고 이미지 업로드 (관리자 전용)
router.post(
  '/site-settings/logo',
  requireAuth,
  requireAdmin,
  logoUpload.single('logo'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다. (jpg, png, webp · 최대 2MB)' });
    }
    const logoUrl = `http://localhost:${process.env.PORT || 5000}/uploads/site/${req.file.filename}`;
    const updated = updateLogo(logoUrl);
    res.json(updated);
  }
);

// POST /api/admin/site-settings/hero-background — 히어로 배경 이미지 업로드 (관리자 전용)
router.post(
  '/site-settings/hero-background',
  requireAuth,
  requireAdmin,
  heroBgUpload.single('heroBackground'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다. (jpg, png, webp · 최대 5MB)' });
    }
    const heroBackgroundUrl = `http://localhost:${process.env.PORT || 5000}/uploads/site/${req.file.filename}`;
    const updated = updateHeroBackground(heroBackgroundUrl);
    res.json(updated);
  }
);

// ──────────────────────────────────────────────
// 서버 모니터링
// ──────────────────────────────────────────────
const os = require('os');
const http = require('http');
const { stats } = require('../lib/serverStats');

// EC2 인스턴스 ID 조회 (IMDSv1, 실패 시 null) — 결과 캐시해서 매 요청마다 기다리지 않음
let _cachedInstanceId = undefined; // undefined = 미조회, null = 조회실패

function fetchInstanceIdOnce() {
  return new Promise(resolve => {
    let done = false;
    const finish = val => { if (!done) { done = true; resolve(val); } };

    // 1.5초 내에 응답 없으면 null
    const fallback = setTimeout(() => finish(null), 1500);

    try {
      const req = http.get(
        { hostname: '169.254.169.254', path: '/latest/meta-data/instance-id', timeout: 1000 },
        res => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => { clearTimeout(fallback); finish(data.trim() || null); });
        }
      );
      req.on('error', () => { clearTimeout(fallback); finish(null); });
      req.on('timeout', () => { req.destroy(); clearTimeout(fallback); finish(null); });
    } catch {
      clearTimeout(fallback);
      finish(null);
    }
  });
}

async function getInstanceId() {
  if (_cachedInstanceId !== undefined) return _cachedInstanceId;
  _cachedInstanceId = await fetchInstanceIdOnce();
  return _cachedInstanceId;
}

// CPU 사용률: 200ms 간격 두 샘플 차이로 계산
function getCpuUsage() {
  return new Promise(resolve => {
    try {
      const s1 = os.cpus().map(c => {
        const total = Object.values(c.times).reduce((a, b) => a + b, 0);
        return { idle: c.times.idle, total };
      });
      setTimeout(() => {
        try {
          const s2 = os.cpus().map(c => {
            const total = Object.values(c.times).reduce((a, b) => a + b, 0);
            return { idle: c.times.idle, total };
          });
          const perCore = s1.map((s, i) => {
            const idleDiff = s2[i].idle - s.idle;
            const totalDiff = s2[i].total - s.total;
            if (totalDiff === 0) return 0;
            return Math.round((1 - idleDiff / totalDiff) * 100);
          });
          const overall = perCore.length > 0
            ? Math.round(perCore.reduce((a, b) => a + b, 0) / perCore.length)
            : 0;
          resolve({ overall, perCore });
        } catch { resolve(null); }
      }, 200);
    } catch { resolve(null); }
  });
}

router.get('/server-monitoring', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [cpuUsage, instanceId] = await Promise.all([getCpuUsage(), getInstanceId()]);

    const toMB = b => Math.round(b / 1024 / 1024 * 10) / 10;
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;

    const procMem = process.memoryUsage();
    const heapUsagePercent = procMem.heapTotal > 0
      ? Math.round((procMem.heapUsed / procMem.heapTotal) * 100)
      : 0;

    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const last5Min = stats.recentTimestamps.filter(t => t > fiveMinAgo).length;
    const last5MinErrors = stats.recentErrorTimestamps.filter(t => t > fiveMinAgo).length;
    const last5Min5xx = stats.recent5xxTimestamps.filter(t => t > fiveMinAgo).length;
    const avgResponseTime = stats.responseTimes.length > 0
      ? Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length)
      : 0;
    const errorRate = stats.totalRequests > 0
      ? ((stats.totalErrors / stats.totalRequests) * 100).toFixed(2) + '%'
      : '0.00%';

    const loadAverage = process.platform !== 'win32' ? os.loadavg() : null;
    const status = last5Min5xx > 0 ? 'degraded' : 'online';

    res.json({
      status,
      environment: process.env.NODE_ENV || 'development',
      serverTime: new Date().toISOString(),
      instance: {
        hostname: os.hostname(),
        instanceId: instanceId || null,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        processId: process.pid,
        uptime: Math.floor(process.uptime()),
        osType: os.type(),
        osRelease: os.release(),
      },
      cpu: {
        cores: os.cpus().length,
        usage: cpuUsage,
        loadAverage,
      },
      memory: {
        total: toMB(memTotal),
        free: toMB(memFree),
        used: toMB(memUsed),
        usagePercent: Math.round((memUsed / memTotal) * 100),
      },
      process: {
        rss: toMB(procMem.rss),
        heapTotal: toMB(procMem.heapTotal),
        heapUsed: toMB(procMem.heapUsed),
        external: toMB(procMem.external),
        arrayBuffers: toMB(procMem.arrayBuffers || 0),
        heapUsagePercent,
      },
      requests: {
        total: stats.totalRequests,
        last5Min,
        totalErrors: stats.totalErrors,
        last5MinErrors,
        errorRate,
        avgResponseTime,
        lastRequestAt: stats.lastRequestAt,
        lastErrorAt: stats.lastErrorAt,
        methods: { ...stats.methods },
        statusGroups: { ...stats.statusGroups },
      },
      recentRequests: [...stats.recentRequests],
      services: {
        backend: 'online',
        databaseProvider: process.env.DB_PROVIDER || 'json/local',
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        frontendUrlConfigured: !!process.env.FRONTEND_URL,
        jwtConfigured: !!process.env.JWT_SECRET,
      },
    });
  } catch {
    res.status(500).json({ error: '서버 정보를 가져오지 못했습니다.' });
  }
});

module.exports = router;
