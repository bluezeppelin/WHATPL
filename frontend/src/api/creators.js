import axios from 'axios';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCreators() {
  const { data } = await axios.get('/api/creators');
  return data;
}

export async function getCreatorProfile(creatorId) {
  const { data } = await axios.get(`/api/creators/${creatorId}`, { headers: authHeader() });
  return data;
}
