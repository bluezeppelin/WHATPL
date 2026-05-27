import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getTracks = (params) => api.get('/tracks', { params }).then(r => r.data);
export const getTrack = (id) => api.get(`/tracks/${id}`).then(r => r.data);
export const uploadTrack = (formData, onProgress) => {
  const token = localStorage.getItem('token');
  return api.post('/tracks', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  }).then(r => r.data);
};
export const updateTrack = (id, formData) => {
  const token = localStorage.getItem('token');
  return api.patch(`/tracks/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).then(r => r.data);
};
export const deleteTrack = (id) => {
  const token = localStorage.getItem('token');
  return api.delete(`/tracks/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(r => r.data);
};
export const incrementPlay = (id) => {
  const token = localStorage.getItem('token');
  return api.post(`/tracks/${id}/play`, null, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(r => r.data);
};
export const getTrendingTracks = (range = '7d', limit = 8) =>
  api.get('/tracks/trending', { params: { range, limit } }).then(r => r.data);
export const getTopLikedTracks = (limit = 8) =>
  api.get('/tracks/top-liked', { params: { limit } }).then(r => r.data);
