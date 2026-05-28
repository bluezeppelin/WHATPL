const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function addRecentlyPlayed(trackId) {
  const token = localStorage.getItem('token');
  if (!token) return; // 비로그인 시 호출 안 함
  await fetch(`${API_BASE}/api/recently-played/${trackId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMyRecentlyPlayed() {
  const res = await fetch(`${API_BASE}/api/recently-played/me`, { headers: authHeader() });
  if (!res.ok) throw new Error('최근 들은 곡 조회 실패');
  return res.json();
}
