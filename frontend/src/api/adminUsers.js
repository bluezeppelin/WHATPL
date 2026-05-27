const BASE = '/api/admin';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAdminUsers({ role, status } = {}) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  const qs = params.toString();
  const res = await fetch(`${BASE}/users${qs ? `?${qs}` : ''}`, { headers: authHeader() });
  if (!res.ok) throw new Error((await res.json()).error || '불러오기 실패');
  return res.json();
}

export async function deactivateUser(userId) {
  const res = await fetch(`${BASE}/users/${userId}/deactivate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
  });
  if (!res.ok) throw new Error((await res.json()).error || '비활성화 실패');
  return res.json();
}

export async function activateUser(userId) {
  const res = await fetch(`${BASE}/users/${userId}/activate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
  });
  if (!res.ok) throw new Error((await res.json()).error || '활성화 실패');
  return res.json();
}
