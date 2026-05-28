'use strict';

const db = require('./db');

function rowToNotif(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

async function createNotification({ userId, type, title, message, link }) {
  const [result] = await db.execute(
    `INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title || null, message || null, link || null]
  );
  const [rows] = await db.execute(`SELECT * FROM notifications WHERE id = ?`, [result.insertId]);
  return rows.length ? rowToNotif(rows[0]) : null;
}

async function createBulkNotifications(userIds, { type, title, message, link }) {
  if (!userIds || userIds.length === 0) return [];
  const created = [];
  for (const userId of userIds) {
    const notif = await createNotification({ userId, type, title, message, link });
    if (notif) created.push(notif);
  }
  return created;
}

async function getNotificationsByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`, [userId]
  );
  return rows.map(rowToNotif);
}

async function getUnreadCount(userId) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0`, [userId]
  );
  return rows[0].cnt;
}

async function markAsRead(userId, notificationId) {
  const [result] = await db.execute(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [notificationId, userId]
  );
  if (result.affectedRows === 0) return null;
  const [rows] = await db.execute(`SELECT * FROM notifications WHERE id = ?`, [notificationId]);
  return rows.length ? rowToNotif(rows[0]) : null;
}

async function markAllAsRead(userId) {
  const [result] = await db.execute(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [userId]
  );
  return result.affectedRows;
}

async function deleteNotification(userId, notificationId) {
  const [result] = await db.execute(
    `DELETE FROM notifications WHERE id = ? AND user_id = ?`, [notificationId, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createNotification, createBulkNotifications,
  getNotificationsByUserId, getUnreadCount,
  markAsRead, markAllAsRead, deleteNotification,
};
