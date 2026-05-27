const express = require('express');
const router = express.Router();
const { getSiteSettings } = require('../lib/siteSettingsStore');

// GET /api/site-settings — 인증 불필요, 누구나 접근 가능
router.get('/', (req, res) => {
  try {
    res.json(getSiteSettings());
  } catch {
    res.json({
      siteName: 'WHATPL',
      logoUrl: '',
      heroBackgroundUrl: '',
      theme: {
        mainColor: '#7c3aed',
        subColor1: '#a78bfa',
        subColor2: '#312e81',
        subColor3: '#111827',
      },
      updatedAt: null,
    });
  }
});

module.exports = router;
