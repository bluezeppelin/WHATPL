import axios from 'axios';

const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCreators() {
  const { data } = await axios.get(`${BASE}/creators`);
  return data;
}

export async function getCreatorProfile(creatorId) {
  const { data } = await axios.get(`${BASE}/creators/${creatorId}`, { headers: authHeader() });
  return data;
}
