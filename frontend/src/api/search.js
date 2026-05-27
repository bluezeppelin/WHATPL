import axios from 'axios';

export async function search(q) {
  const { data } = await axios.get('/api/search', { params: { q } });
  return data;
}
