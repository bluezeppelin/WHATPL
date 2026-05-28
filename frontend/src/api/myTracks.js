const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMyUploadedTracks() {
  const res = await fetch(`${API_BASE}/api/my/tracks`, { headers: authHeader() });
  if (!res.ok) throw new Error((await res.json()).error || '불러오기 실패');
  return res.json();
}

export async function updateMyUploadedTrack(trackId, updates) {
  const res = await fetch(`${API_BASE}/api/my/tracks/${trackId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error((await res.json()).error || '수정 실패');
  return res.json();
}

export async function createTrackDeleteRequest(trackId, reason) {
  const res = await fetch(`${API_BASE}/api/my/tracks/${trackId}/delete-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error((await res.json()).error || '삭제 요청 실패');
  return res.json();
}

export async function getMyTrackDeleteRequests() {
  const res = await fetch(`${API_BASE}/api/my/track-delete-requests`, { headers: authHeader() });
  if (!res.ok) throw new Error((await res.json()).error || '불러오기 실패');
  return res.json();
}
