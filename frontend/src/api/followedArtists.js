import axios from 'axios';

const BASE = '/api/followed-artists';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMyFollowedArtists() {
  const { data } = await axios.get(`${BASE}/me`, { headers: authHeader() });
  return data;
}

export async function getArtistFollowStatus(artistName) {
  const { data } = await axios.get(`${BASE}/${encodeURIComponent(artistName)}`, { headers: authHeader() });
  return data;
}

export async function followArtist(artistName) {
  const { data } = await axios.post(`${BASE}/${encodeURIComponent(artistName)}`, {}, { headers: authHeader() });
  return data;
}

export async function unfollowArtist(artistName) {
  const { data } = await axios.delete(`${BASE}/${encodeURIComponent(artistName)}`, { headers: authHeader() });
  return data;
}

export async function getMyFollowers() {
  const { data } = await axios.get(`${BASE}/my-followers`, { headers: authHeader() });
  return data;
}
