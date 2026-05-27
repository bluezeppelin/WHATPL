const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const notificationStore = require('../lib/notificationStore');

// GET /api/notifications — 내 알림 전체 목록
router.get('/', requireAuth, (req, res) => {
  const notifications = notificationStore.getNotificationsByUserId(req.user.id);
  res.json({ notifications });
});

// GET /api/notifications/unread-count — 읽지 않은 알림 수
router.get('/unread-count', requireAuth, (req, res) => {
  const unreadCount = notificationStore.getUnreadCount(req.user.id);
  res.json({ unreadCount });
});

// PATCH /api/notifications/read-all — 모두 읽음 처리 (/:id 보다 먼저 정의)
router.patch('/read-all', requireAuth, (req, res) => {
  notificationStore.markAllAsRead(req.user.id);
  res.json({ message: '모두 읽음 처리했습니다.' });
});

// PATCH /api/notifications/:id/read — 단일 읽음 처리
router.patch('/:id/read', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID입니다.' });
  const updated = notificationStore.markAsRead(req.user.id, id);
  if (!updated) return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
  res.json({ notification: updated });
});

// DELETE /api/notifications/:id — 알림 삭제
router.delete('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID입니다.' });
  const deleted = notificationStore.deleteNotification(req.user.id, id);
  if (!deleted) return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
  res.json({ message: '알림이 삭제되었습니다.' });
});

module.exports = router;
