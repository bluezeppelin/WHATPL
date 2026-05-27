const BASE = '/api/admin';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAdminTracks() {
  const res = await fetch(`${BASE}/tracks`, { headers: authHeader() });
  if (!res.ok) throw new Error((await res.json()).error || '불러오기 실패');
  return res.json();
}

export async function updateAdminTrack(trackId, updates) {
  const res = await fetch(`${BASE}/tracks/${trackId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error((await res.json()).error || '수정 실패');
  return res.json();
}

export async function deleteAdminTrack(trackId, deleteReason = '') {
  const res = await fetch(`${BASE}/tracks/${trackId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ deleteReason }),
  });
  if (!res.ok) throw new Error((await res.json()).error || '삭제 실패');
  return res.json();
}

export async function getAdminDeleteRequests(status) {
  const url = status ? `${BASE}/track-delete-requests?status=${status}` : `${BASE}/track-delete-requests`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error((await res.json()).error || '불러오기 실패');
  return res.json();
}

export async function approveDeleteRequest(id) {
  const res = await fetch(`${BASE}/track-delete-requests/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
  });
  if (!res.ok) throw new Error((await res.json()).error || '승인 실패');
  return res.json();
}

export async function rejectDeleteRequest(id, rejectReason = '') {
  const res = await fetch(`${BASE}/track-delete-requests/${id}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ rejectReason }),
  });
  if (!res.ok) throw new Error((await res.json()).error || '반려 실패');
  return res.json();
}

export async function hardDeleteTrack(trackId) {
  const token = localStorage.getItem('token');
  const adminReauthToken = sessionStorage.getItem('adminReauthToken');
  const res = await fetch(`${BASE}/tracks/${trackId}/hard`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminReauthToken ? { 'X-Admin-Reauth-Token': adminReauthToken } : {}),
    },
  });
  if (!res.ok) throw new Error((await res.json()).error || '영구 삭제 실패');
  return res.json();
}

export async function getHardDeleteLogs() {
  const res = await fetch(`${BASE}/hard-delete-logs`, { headers: authHeader() });
  if (!res.ok) throw new Error((await res.json()).error || '불러오기 실패');
  return res.json();
}
