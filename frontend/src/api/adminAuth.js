const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api/admin';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function reauthAdmin(password) {
  const res = await fetch(`${BASE}/reauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || '인증 실패');
  return res.json();
}
