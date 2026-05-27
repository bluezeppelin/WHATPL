const BASE = '/api/player-session';

function authHeaders() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function getMyPlayerSession() {
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(`${BASE}/me`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session;
  } catch {
    return null;
  }
}

export async function savePlayerSession(payload) {
  const headers = authHeaders();
  if (!headers) return;
  try {
    await fetch(BASE, { method: 'PUT', headers, body: JSON.stringify(payload) });
  } catch {}
}
