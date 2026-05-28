import axios from 'axios';

const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api';

export async function getSiteSettings() {
  const res = await axios.get(`${BASE}/site-settings`);
  return res.data;
}

export async function updateSiteTheme(theme) {
  const token = localStorage.getItem('token');
  const res = await axios.patch(`${BASE}/admin/site-settings`, theme, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function uploadSiteLogo(file) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('logo', file);
  const res = await axios.post(`${BASE}/admin/site-settings/logo`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function uploadHeroBackground(file) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('heroBackground', file);
  const res = await axios.post(`${BASE}/admin/site-settings/hero-background`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}
