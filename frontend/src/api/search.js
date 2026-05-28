import axios from 'axios';

const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api';

export async function search(q) {
  const { data } = await axios.get(`${BASE}/search`, { params: { q } });
  return data;
}
