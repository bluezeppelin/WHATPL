require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const trackRoutes = require('./routes/tracks');
const playlistRoutes = require('./routes/playlists');
const authRoutes = require('./routes/auth');
const creatorRequestRoutes = require('./routes/creatorRequests');
const likedTracksRoutes = require('./routes/likedTracks');
const followedArtistsRoutes = require('./routes/followedArtists');
const adminRoutes = require('./routes/admin');
const myTracksRoutes = require('./routes/myTracks');
const recentlyPlayedRoutes = require('./routes/recentlyPlayed');
const playerSessionRoutes = require('./routes/playerSessions');
const siteSettingsRoutes = require('./routes/siteSettings');
const creatorRoutes = require('./routes/creators');
const searchRoutes = require('./routes/search');
const notificationRoutes = require('./routes/notifications');
const imageProxyRoutes = require('./routes/imageProxy');

const statsMiddleware = require('./middleware/statsMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json());
app.use('/api', statsMiddleware);

// 업로드된 파일을 정적으로 서빙 (로컬 테스트용)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/creator-requests', creatorRequestRoutes);
app.use('/api/likes', likedTracksRoutes);
app.use('/api/followed-artists', followedArtistsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/my', myTracksRoutes);
app.use('/api/recently-played', recentlyPlayedRoutes);
app.use('/api/player-session', playerSessionRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/image-proxy', imageProxyRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
