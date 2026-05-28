import axios from 'axios';

const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api/notifications';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getNotifications({ page = 1, limit = 20 } = {}) {
  const { data } = await axios.get(BASE, {
    params: { page, limit },
    headers: authHeader(),
  });
  return data;
}

export async function getUnreadCount() {
  const { data } = await axios.get(`${BASE}/unread-count`, { headers: authHeader() });
  return data;
}

export async function markAsRead(notificationId) {
  const { data } = await axios.patch(`${BASE}/${notificationId}/read`, {}, { headers: authHeader() });
  return data;
}

export async function markAllAsRead() {
  const { data } = await axios.patch(`${BASE}/read-all`, {}, { headers: authHeader() });
  return data;
}

export async function deleteNotification(notificationId) {
  const { data } = await axios.delete(`${BASE}/${notificationId}`, { headers: authHeader() });
  return data;
}
