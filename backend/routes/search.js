const express = require('express');
const router = express.Router();
const { getAllTracks } = require('../lib/store');
const { getAllUsers } = require('../lib/userStore');

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q) return res.json({ tracks: [], creators: [] });

    const tracks = (await getAllTracks())
      .filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.genre?.toLowerCase().includes(q)
      )
      .map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        creatorName: t.artist,
        coverUrl: t.coverUrl || null,
        audioUrl: t.audioUrl || null,
        genre: t.genre || '',
        uploadedByUserId: t.uploadedByUserId || null,
      }));

    const creators = (await getAllUsers())
      .filter(u =>
        u.role === 'creator' &&
        u.artistName &&
        (u.status || 'active') === 'active' &&
        (
          u.artistName.toLowerCase().includes(q) ||
          u.name?.toLowerCase().includes(q)
        )
      )
      .map(u => ({
        id: u.id,
        creatorName: u.artistName,
        profileImageUrl: u.profileImageUrl || null,
        name: u.name,
      }));

    res.json({ tracks, creators });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
