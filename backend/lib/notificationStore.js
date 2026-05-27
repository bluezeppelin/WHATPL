'use strict';

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/notifications.json');

function read() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '[]', 'utf-8');
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function write(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function nextId(notifications) {
  if (notifications.length === 0) return 1;
  return Math.max(...notifications.map(n => n.id)) + 1;
}

// MySQL 전환 시 이 함수들만 SQL INSERT/SELECT/UPDATE/DELETE로 교체하면 됨

function createNotification({ userId, type, title, message, link }) {
  const notifications = read();
  const notification = {
    id: nextId(notifications),
    userId,
    type,
    title,
    message,
    link: link || null,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  notifications.push(notification);
  write(notifications);
  return notification;
}

function createBulkNotifications(userIds, { type, title, message, link }) {
  if (!userIds || userIds.length === 0) return [];
  const notifications = read();
  let maxId = notifications.length === 0 ? 0 : Math.max(...notifications.map(n => n.id));
  const now = new Date().toISOString();
  const created = userIds.map(userId => {
    maxId++;
    return { id: maxId, userId, type, title, message, link: link || null, isRead: false, createdAt: now };
  });
  notifications.push(...created);
  write(notifications);
  return created;
}

function getNotificationsByUserId(userId) {
  return read()
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getUnreadCount(userId) {
  return read().filter(n => n.userId === userId && !n.isRead).length;
}

function markAsRead(userId, notificationId) {
  const notifications = read();
  const idx = notifications.findIndex(n => n.id === notificationId && n.userId === userId);
  if (idx === -1) return null;
  notifications[idx].isRead = true;
  write(notifications);
  return notifications[idx];
}

function markAllAsRead(userId) {
  const notifications = read();
  let changed = 0;
  for (const n of notifications) {
    if (n.userId === userId && !n.isRead) { n.isRead = true; changed++; }
  }
  if (changed > 0) write(notifications);
  return changed;
}

function deleteNotification(userId, notificationId) {
  const notifications = read();
  const idx = notifications.findIndex(n => n.id === notificationId && n.userId === userId);
  if (idx === -1) return false;
  notifications.splice(idx, 1);
  write(notifications);
  return true;
}

module.exports = {
  createNotification,
  createBulkNotifications,
  getNotificationsByUserId,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
