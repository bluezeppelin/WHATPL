import axios from 'axios';

export async function getSiteSettings() {
  const res = await axios.get('/api/site-settings');
  return res.data;
}

export async function updateSiteTheme(theme) {
  const token = localStorage.getItem('token');
  const res = await axios.patch('/api/admin/site-settings', theme, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function uploadSiteLogo(file) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('logo', file);
  const res = await axios.post('/api/admin/site-settings/logo', formData, {
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
  const res = await axios.post('/api/admin/site-settings/hero-background', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}
