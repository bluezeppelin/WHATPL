const BASE = '/api/admin';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getServerMonitoring() {
  const res = await fetch(`${BASE}/server-monitoring`, { headers: authHeader() });
  if (!res.ok) throw new Error((await res.json()).error || '불러오기 실패');
  return res.json();
}
