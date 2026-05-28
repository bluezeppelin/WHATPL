import axios from 'axios';

const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api/auth';

export async function checkLoginId(loginId) {
  const { data } = await axios.get(`${BASE}/check-id`, { params: { loginId } });
  return data;
}

export async function checkArtistName(artistName) {
  const { data } = await axios.get(`${BASE}/check-artist-name`, { params: { artistName } });
  return data;
}

export async function signup(formData) {
  const { data } = await axios.post(`${BASE}/signup`, formData);
  return data;
}

export async function login(credentials) {
  const { data } = await axios.post(`${BASE}/login`, credentials);
  return data;
}

export async function getMe(token) {
  const { data } = await axios.get(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function updateMe(updates) {
  const token = localStorage.getItem('token');
  const { data } = await axios.patch(`${BASE}/me`, updates, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function findLoginId({ name, email }) {
  const { data } = await axios.post(`${BASE}/find-id`, { name, email });
  return data;
}

export async function resetPassword({ loginId, email, newPassword, confirmPassword }) {
  const { data } = await axios.post(`${BASE}/reset-password`, { loginId, email, newPassword, confirmPassword });
  return data;
}

export async function uploadProfileImage(file) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('profileImage', file);
  const { data } = await axios.post(`${BASE}/me/profile-image`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const token = localStorage.getItem('token');
  const { data } = await axios.patch(`${BASE}/change-password`, { currentPassword, newPassword }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function deleteAccount(password) {
  const token = localStorage.getItem('token');
  const { data } = await axios.delete(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { password },
  });
  return data;
}
