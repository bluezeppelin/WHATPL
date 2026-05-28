const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const notificationStore = require('../lib/notificationStore');

// GET /api/notifications — 내 알림 전체 목록
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await notificationStore.getNotificationsByUserId(req.user.id);
    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/notifications/unread-count — 읽지 않은 알림 수
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const unreadCount = await notificationStore.getUnreadCount(req.user.id);
    res.json({ unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/notifications/read-all — 모두 읽음 처리 (/:id 보다 먼저 정의)
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await notificationStore.markAllAsRead(req.user.id);
    res.json({ message: '모두 읽음 처리했습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// PATCH /api/notifications/:id/read — 단일 읽음 처리
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID입니다.' });
    const updated = await notificationStore.markAsRead(req.user.id, id);
    if (!updated) return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    res.json({ notification: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// DELETE /api/notifications/:id — 알림 삭제
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID입니다.' });
    const deleted = await notificationStore.deleteNotification(req.user.id, id);
    if (!deleted) return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    res.json({ message: '알림이 삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
