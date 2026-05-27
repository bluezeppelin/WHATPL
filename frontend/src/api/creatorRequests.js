import axios from 'axios';

const BASE = '/api/creator-requests';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createCreatorRequest(message) {
  const { data } = await axios.post(BASE, { message }, { headers: authHeader() });
  return data;
}

export async function getMyCreatorRequest() {
  const { data } = await axios.get(`${BASE}/me`, { headers: authHeader() });
  return data;
}

export async function getCreatorRequests(status) {
  const params = status ? { status } : {};
  const { data } = await axios.get(BASE, { headers: authHeader(), params });
  return data;
}

export async function approveCreatorRequest(id) {
  const { data } = await axios.patch(`${BASE}/${id}/approve`, {}, { headers: authHeader() });
  return data;
}

export async function rejectCreatorRequest(id, rejectReason) {
  const { data } = await axios.patch(`${BASE}/${id}/reject`, { rejectReason }, { headers: authHeader() });
  return data;
}
