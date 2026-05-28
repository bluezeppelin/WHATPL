const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { requireAuth, requireAdminReauth, JWT_SECRET } = require('../middleware/authMiddleware');
const { getAllTracksIncludingDeleted, getTrackById, updateTrack, deleteTrack, softDeleteTrack, suspendTracksByUser, restoreTracksByUser } = require('../lib/store');
const { cleanupTrackForSoftDelete, cleanupTrackForHardDelete } = require('../lib/trackReferenceCleanup');
const trackDeleteReqStore = require('../lib/trackDeleteRequestStore');
const hardDeleteLogStore = require('../lib/hardDeleteLogStore');
const { getAllUsers, findById: findUserById, updateUser, sanitize: sanitizeUser } = require('../lib/userStore');
const { getSiteSettings, updateTheme, updateLogo, updateHeroBackground, validateHexColor } = require('../lib/siteSettingsStore');
const notificationStore = require('../lib/notificationStore');
const { uploadSite, getFileUrl, deleteFromS3 } = require('../lib/s3');

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
  }
  next();
}

async function hardDeleteTrackCompletely(track, deletedBy) {
  const trackId = track.id;

  await cleanupTrackForHardDelete(trackId);

  try { if (track.audioKey) await deleteFromS3(track.audioKey); } catch {}
  try { if (track.coverKey) await deleteFromS3(track.coverKey); } catch {}

  await hardDeleteLogStore.addLog({
    trackId,
    title: track.title,
    artist: track.artist,
    deletedBy: deletedBy || null,
    reason: `hard delete by admin (이전 상태: ${track.status || 'active'})`,
  });

  await deleteTrack(trackId);
}

// POST /api/admin/reauth
router.post('/reauth', requireAuth, requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
  try {
    const userWithHash = await findUserById(req.user.id);
    if (!userWithHash) return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    const valid = await bcrypt.compare(password, userWithHash.passwordHash);
    if (!valid) return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    const REAUTH_EXPIRES = 15 * 60;
    const adminReauthToken = jwt.sign(
      { id: req.user.id, role: req.user.role, purpose: 'admin_reauth' },
      JWT_SECRET,
      { expiresIn: REAUTH_EXPIRES }
    );
    res.json({ adminReauthToken, expiresIn: REAUTH_EXPIRES });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 음원 목록 조회 (삭제된 트랙 포함)
router.get('/tracks', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tracks = await getAllTracksIncludingDeleted();
    res.json({ tracks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 음원 정보 수정
router.patch('/tracks/:trackId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const track = await getTrackById(req.params.trackId);
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

    const updated = await updateTrack(req.params.trackId, updates);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 음원 소프트 삭제
router.delete('/tracks/:trackId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { deleteReason } = req.body;
    const track = await softDeleteTrack(req.params.trackId, req.user.loginId, deleteReason || '');
    if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

    await cleanupTrackForSoftDelete(track.id);

    try {
      if (track.uploadedByUserId) {
        await notificationStore.createNotification({
          userId: track.uploadedByUserId,
          type: 'track_removed_by_admin',
          title: '음원 처리 알림',
          message: `'${track.title}'이 관리자에 의해 삭제 처리되었습니다.`,
          link: '/mypage?tab=creator',
        });
      }
    } catch {}

    res.json({ message: '삭제되었습니다.', track });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 영구 삭제
router.delete('/tracks/:id/hard', requireAuth, requireAdmin, requireAdminReauth, async (req, res) => {
  try {
    const track = await getTrackById(req.params.id);
    if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
    if (track.status !== 'deleted') {
      return res.status(409).json({
        error: 'soft delete 처리된 음원만 영구 삭제할 수 있습니다. 먼저 관리자 삭제(soft delete)를 진행해주세요.',
      });
    }
    await hardDeleteTrackCompletely(track, req.user.loginId);
    res.json({ message: '영구 삭제되었습니다.', trackId: track.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 영구 삭제 로그 조회
router.get('/hard-delete-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await hardDeleteLogStore.getAll();
    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 삭제 요청 목록 조회
router.get('/track-delete-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const list = await trackDeleteReqStore.getAll(status || null);
    res.json({ requests: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 삭제 요청 승인
router.patch('/track-delete-requests/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleteReq = await trackDeleteReqStore.findById(req.params.id);
    if (!deleteReq) return res.status(404).json({ error: '삭제 요청을 찾을 수 없습니다.' });
    if (deleteReq.status !== 'pending') return res.status(409).json({ error: '이미 처리된 요청입니다.' });

    const track = await softDeleteTrack(deleteReq.trackId, req.user.loginId, `삭제 요청 승인 (요청자: ${deleteReq.creatorLoginId})`);
    if (!track) return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });

    await cleanupTrackForSoftDelete(deleteReq.trackId);

    const updated = await trackDeleteReqStore.update(req.params.id, {
      status: 'approved',
      reviewedBy: req.user.loginId,
      reviewedAt: new Date().toISOString(),
    });

    try {
      if (track.uploadedByUserId) {
        await notificationStore.createNotification({
          userId: track.uploadedByUserId,
          type: 'track_delete_approved',
          title: '삭제 요청 승인',
          message: `'${track.title}' 삭제 요청이 승인되었습니다.`,
          link: '/mypage?tab=creator',
        });
      }
    } catch {}

    res.json({ request: updated, track });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 삭제 요청 반려
router.patch('/track-delete-requests/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleteReq = await trackDeleteReqStore.findById(req.params.id);
    if (!deleteReq) return res.status(404).json({ error: '삭제 요청을 찾을 수 없습니다.' });
    if (deleteReq.status !== 'pending') return res.status(409).json({ error: '이미 처리된 요청입니다.' });

    const { rejectReason } = req.body;
    const updated = await trackDeleteReqStore.update(req.params.id, {
      status: 'rejected',
      reviewedBy: req.user.loginId,
      reviewedAt: new Date().toISOString(),
      rejectReason: rejectReason || '',
    });

    try {
      const rejectedTrack = await getTrackById(deleteReq.trackId);
      if (rejectedTrack?.uploadedByUserId) {
        await notificationStore.createNotification({
          userId: rejectedTrack.uploadedByUserId,
          type: 'track_delete_rejected',
          title: '삭제 요청 거절',
          message: `'${rejectedTrack.title}' 삭제 요청이 거절되었습니다.`,
          link: '/mypage?tab=creator',
        });
      }
    } catch {}

    res.json({ request: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 회원 목록 조회
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, status } = req.query;
    const users = (await getAllUsers({ role: role || undefined, status: status || undefined })).map(sanitizeUser);
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 회원 비활성화
router.patch('/users/:userId/deactivate', requireAuth, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.id) return res.status(400).json({ error: '자기 자신을 비활성화할 수 없습니다.' });
  try {
    const target = await findUserById(userId);
    if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    if (target.role === 'admin') return res.status(403).json({ error: 'admin 계정은 비활성화할 수 없습니다.' });
    if ((target.status || 'active') === 'inactive') return res.status(409).json({ error: '이미 비활성화된 계정입니다.' });

    const updated = await updateUser(userId, {
      status: 'inactive',
      deactivatedAt: new Date().toISOString(),
      deactivatedBy: req.user.id,
    });
    await suspendTracksByUser(userId, req.user.loginId);

    try {
      await notificationStore.createNotification({
        userId: target.id,
        type: 'account_status_changed',
        title: '계정 상태 변경',
        message: '계정이 관리자에 의해 비활성화되었습니다.',
        link: '/mypage',
      });
    } catch {}

    res.json({ message: '회원이 비활성화되었습니다.', user: sanitizeUser(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 회원 활성화
router.patch('/users/:userId/activate', requireAuth, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    const target = await findUserById(userId);
    if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    if ((target.status || 'active') === 'active') return res.status(409).json({ error: '이미 활성화된 계정입니다.' });

    const updated = await updateUser(userId, { status: 'active', deactivatedAt: null, deactivatedBy: null });
    await restoreTracksByUser(userId);

    try {
      await notificationStore.createNotification({
        userId: target.id,
        type: 'account_status_changed',
        title: '계정 상태 변경',
        message: '계정이 관리자에 의해 다시 활성화되었습니다.',
        link: '/mypage',
      });
    } catch {}

    res.json({ message: '회원이 활성화되었습니다.', user: sanitizeUser(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/admin/site-settings — 색상 저장
router.patch('/site-settings', requireAuth, requireAdmin, async (req, res) => {
  const { mainColor, subColor1, subColor2, subColor3 } = req.body;
  const colors = { mainColor, subColor1, subColor2, subColor3 };
  for (const [key, val] of Object.entries(colors)) {
    if (val !== undefined && !validateHexColor(val)) {
      return res.status(400).json({ error: `${key}의 색상 형식이 올바르지 않습니다. (#RGB 또는 #RRGGBB 형식만 허용)` });
    }
  }
  try {
    const updated = await updateTheme(colors);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/admin/site-settings/logo
router.post('/site-settings/logo', requireAuth, requireAdmin, uploadSite.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요합니다. (jpg, png, webp · 최대 5MB)' });
  try {
    const logoUrl = getFileUrl(req.file.key);
    const updated = await updateLogo(logoUrl);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/admin/site-settings/hero-background
router.post('/site-settings/hero-background', requireAuth, requireAdmin, uploadSite.single('heroBackground'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요합니다. (jpg, png, webp · 최대 5MB)' });
  try {
    const heroBackgroundUrl = getFileUrl(req.file.key);
    const updated = await updateHeroBackground(heroBackgroundUrl);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ──────────────────────────────────────────────
// 서버 모니터링
// ──────────────────────────────────────────────
const os = require('os');
const http = require('http');
const { stats } = require('../lib/serverStats');

let _cachedInstanceId = undefined;

function fetchInstanceIdOnce() {
  return new Promise(resolve => {
    let done = false;
    const finish = val => { if (!done) { done = true; resolve(val); } };
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
    } catch { clearTimeout(fallback); finish(null); }
  });
}

async function getInstanceId() {
  if (_cachedInstanceId !== undefined) return _cachedInstanceId;
  _cachedInstanceId = await fetchInstanceIdOnce();
  return _cachedInstanceId;
}

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
      ? Math.round((procMem.heapUsed / procMem.heapTotal) * 100) : 0;
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const last5Min = stats.recentTimestamps.filter(t => t > fiveMinAgo).length;
    const last5MinErrors = stats.recentErrorTimestamps.filter(t => t > fiveMinAgo).length;
    const last5Min5xx = stats.recent5xxTimestamps.filter(t => t > fiveMinAgo).length;
    const avgResponseTime = stats.responseTimes.length > 0
      ? Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length) : 0;
    const errorRate = stats.totalRequests > 0
      ? ((stats.totalErrors / stats.totalRequests) * 100).toFixed(2) + '%' : '0.00%';
    const loadAverage = process.platform !== 'win32' ? os.loadavg() : null;
    const status = last5Min5xx > 0 ? 'degraded' : 'online';

    res.json({
      status,
      environment: process.env.NODE_ENV || 'development',
      serverTime: new Date().toISOString(),
      instance: {
        hostname: os.hostname(), instanceId: instanceId || null,
        platform: process.platform, arch: process.arch,
        nodeVersion: process.version, processId: process.pid,
        uptime: Math.floor(process.uptime()), osType: os.type(), osRelease: os.release(),
      },
      cpu: { cores: os.cpus().length, usage: cpuUsage, loadAverage },
      memory: { total: toMB(memTotal), free: toMB(memFree), used: toMB(memUsed), usagePercent: Math.round((memUsed / memTotal) * 100) },
      process: {
        rss: toMB(procMem.rss), heapTotal: toMB(procMem.heapTotal),
        heapUsed: toMB(procMem.heapUsed), external: toMB(procMem.external),
        arrayBuffers: toMB(procMem.arrayBuffers || 0), heapUsagePercent,
      },
      requests: {
        total: stats.totalRequests, last5Min,
        totalErrors: stats.totalErrors, last5MinErrors, errorRate, avgResponseTime,
        lastRequestAt: stats.lastRequestAt, lastErrorAt: stats.lastErrorAt,
        methods: { ...stats.methods }, statusGroups: { ...stats.statusGroups },
      },
      recentRequests: [...stats.recentRequests],
      services: {
        backend: 'online',
        databaseProvider: 'mysql/rds',
        storageProvider: 's3',
        frontendUrlConfigured: !!process.env.FRONTEND_URL,
        jwtConfigured: !!process.env.JWT_SECRET,
      },
    });
  } catch {
    res.status(500).json({ error: '서버 정보를 가져오지 못했습니다.' });
  }
});

module.exports = router;
