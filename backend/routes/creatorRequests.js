const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/authMiddleware');
const { findPendingByUserId, getLatestByUserId, createRequest, getAllRequests, findById, updateRequest } = require('../lib/creatorRequestStore');
const { findById: findUserById, updateUser, sanitize } = require('../lib/userStore');
const notificationStore = require('../lib/notificationStore');

const router = express.Router();

// POST /api/creator-requests — Creator 신청 생성
router.post('/', requireAuth, async (req, res) => {
  try {
    const { user } = req;

    if (user.role === 'creator') {
      return res.status(400).json({ error: '이미 Creator 회원입니다.' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ error: '관리자는 Creator 신청이 필요하지 않습니다.' });
    }

    const existing = await findPendingByUserId(user.id);
    if (existing) {
      return res.status(409).json({ error: '이미 처리 중인 Creator 신청이 있습니다.', request: existing });
    }

    const artistName = user.artistName?.trim() || '';
    if (!artistName) {
      return res.status(400).json({ error: '프로필에 아티스트명이 없습니다. 마이페이지에서 먼저 등록해주세요.' });
    }

    const { message } = req.body;

    const now = new Date().toISOString();
    const newRequest = {
      id: uuidv4(),
      userId: user.id,
      loginId: user.loginId,
      name: user.name,
      artistName,
      message: message?.trim() || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const created = await createRequest(newRequest);
    res.status(201).json({ message: 'Creator 신청이 완료되었습니다.', request: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/creator-requests/me — 내 최신 신청 상태 조회
router.get('/me', requireAuth, async (req, res) => {
  try {
    const request = await getLatestByUserId(req.user.id);
    res.json({ request: request || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/creator-requests — 전체 신청 목록 (admin 전용)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
    }
    const { status } = req.query;
    let requests = await getAllRequests();
    if (status) {
      requests = requests.filter(r => r.status === status);
    }
    requests = requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/creator-requests/:id/approve — 승인 (admin 전용)
router.patch('/:id/approve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
    }
    const request = await findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `이미 ${request.status === 'approved' ? '승인된' : '반려된'} 신청입니다.` });
    }

    const updatedRequest = await updateRequest(request.id, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.loginId,
    });

    const updatedUser = await updateUser(request.userId, { role: 'creator' });

    try {
      await notificationStore.createNotification({
        userId: request.userId,
        type: 'creator_request_approved',
        title: '크리에이터 신청 승인',
        message: '크리에이터 신청이 승인되었습니다. 이제 음원을 업로드할 수 있습니다.',
        link: '/upload',
      });
    } catch {}

    res.json({
      message: 'Creator 신청이 승인되었습니다.',
      request: updatedRequest,
      user: sanitize(updatedUser),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/creator-requests/:id/reject — 반려 (admin 전용)
router.patch('/:id/reject', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
    }
    const request = await findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `이미 ${request.status === 'approved' ? '승인된' : '반려된'} 신청입니다.` });
    }

    const { rejectReason } = req.body;
    const updatedRequest = await updateRequest(request.id, {
      status: 'rejected',
      rejectReason: rejectReason?.trim() || '',
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.loginId,
    });

    try {
      await notificationStore.createNotification({
        userId: request.userId,
        type: 'creator_request_rejected',
        title: '크리에이터 신청 거절',
        message: '크리에이터 신청이 거절되었습니다. 사유를 확인해 주세요.',
        link: '/mypage?tab=creator',
      });
    } catch {}

    res.json({
      message: 'Creator 신청이 반려되었습니다.',
      request: updatedRequest,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
