import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getPlaylists = () => api.get('/playlists').then(r => r.data);
export const getPlaylist = (id) => api.get(`/playlists/${id}`).then(r => r.data);
export const createPlaylist = (name) => api.post('/playlists', { name }).then(r => r.data);
export const renamePlaylist = (id, name) => api.patch(`/playlists/${id}`, { name }).then(r => r.data);
export const deletePlaylist = (id) => api.delete(`/playlists/${id}`).then(r => r.data);
export const addTrackToPlaylist = (playlistId, trackId) =>
  api.post(`/playlists/${playlistId}/tracks`, { trackId }).then(r => r.data);
export const removeTrackFromPlaylistAt = (playlistId, index) =>
  api.delete(`/playlists/${playlistId}/tracks/at/${index}`).then(r => r.data);
export const removeTrackFromPlaylistById = (playlistId, trackId) =>
  api.delete(`/playlists/${playlistId}/tracks/by-id/${trackId}`).then(r => r.data);
export const syncQueueToPlaylist = (trackIds) =>
  api.put('/playlists/0/tracks', { trackIds }).then(r => r.data);
export const reorderPlaylist = (playlistId, trackIds) =>
  api.put(`/playlists/${playlistId}/tracks`, { trackIds }).then(r => r.data);
