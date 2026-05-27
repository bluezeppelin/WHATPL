const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'siteSettings.json');

const DEFAULT_SETTINGS = {
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
};

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

function save(settings) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(settings, null, 2), 'utf8');
}

function validateHexColor(value) {
  return typeof value === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

function getSiteSettings() {
  const s = load();
  return {
    siteName: s.siteName ?? DEFAULT_SETTINGS.siteName,
    logoUrl: s.logoUrl ?? '',
    heroBackgroundUrl: s.heroBackgroundUrl ?? '',
    theme: {
      mainColor: s.theme?.mainColor ?? DEFAULT_SETTINGS.theme.mainColor,
      subColor1: s.theme?.subColor1 ?? DEFAULT_SETTINGS.theme.subColor1,
      subColor2: s.theme?.subColor2 ?? DEFAULT_SETTINGS.theme.subColor2,
      subColor3: s.theme?.subColor3 ?? DEFAULT_SETTINGS.theme.subColor3,
    },
    updatedAt: s.updatedAt ?? null,
  };
}

function updateTheme(theme) {
  const current = load();
  if (!current.theme) current.theme = { ...DEFAULT_SETTINGS.theme };
  if (theme.mainColor !== undefined) current.theme.mainColor = theme.mainColor;
  if (theme.subColor1 !== undefined) current.theme.subColor1 = theme.subColor1;
  if (theme.subColor2 !== undefined) current.theme.subColor2 = theme.subColor2;
  if (theme.subColor3 !== undefined) current.theme.subColor3 = theme.subColor3;
  current.updatedAt = new Date().toISOString();
  save(current);
  return getSiteSettings();
}

function updateLogo(logoUrl) {
  const current = load();
  current.logoUrl = logoUrl;
  current.updatedAt = new Date().toISOString();
  save(current);
  return getSiteSettings();
}

function updateHeroBackground(heroBackgroundUrl) {
  const current = load();
  current.heroBackgroundUrl = heroBackgroundUrl;
  current.updatedAt = new Date().toISOString();
  save(current);
  return getSiteSettings();
}

module.exports = { getSiteSettings, updateTheme, updateLogo, updateHeroBackground, validateHexColor };
