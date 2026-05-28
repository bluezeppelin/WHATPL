import axios from 'axios';

const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api/likes';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMyLikedTracks() {
  const { data } = await axios.get(`${BASE}/me`, { headers: authHeader() });
  return data;
}

export async function getTrackLikeStatus(trackId) {
  const { data } = await axios.get(`${BASE}/${trackId}`, { headers: authHeader() });
  return data;
}

export async function likeTrack(trackId) {
  const { data } = await axios.post(`${BASE}/${trackId}`, {}, { headers: authHeader() });
  return data;
}

export async function unlikeTrack(trackId) {
  const { data } = await axios.delete(`${BASE}/${trackId}`, { headers: authHeader() });
  return data;
}
