const db = require('./db');

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

function validateHexColor(value) {
  return typeof value === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

function rowToSettings(row) {
  if (!row) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  return {
    siteName: row.site_name ?? DEFAULT_SETTINGS.siteName,
    logoUrl: row.logo_url ?? '',
    heroBackgroundUrl: row.hero_background_url ?? '',
    theme: {
      mainColor: row.main_color ?? DEFAULT_SETTINGS.theme.mainColor,
      subColor1: row.sub_color1 ?? DEFAULT_SETTINGS.theme.subColor1,
      subColor2: row.sub_color2 ?? DEFAULT_SETTINGS.theme.subColor2,
      subColor3: row.sub_color3 ?? DEFAULT_SETTINGS.theme.subColor3,
    },
    updatedAt: row.updated_at ?? null,
  };
}

async function getSiteSettings() {
  const [rows] = await db.execute(`SELECT * FROM site_settings WHERE id = 1`);
  return rowToSettings(rows[0]);
}

async function updateTheme(theme) {
  const setClauses = [], values = [];
  if (theme.mainColor !== undefined) { setClauses.push('main_color = ?');  values.push(theme.mainColor); }
  if (theme.subColor1 !== undefined) { setClauses.push('sub_color1 = ?');  values.push(theme.subColor1); }
  if (theme.subColor2 !== undefined) { setClauses.push('sub_color2 = ?');  values.push(theme.subColor2); }
  if (theme.subColor3 !== undefined) { setClauses.push('sub_color3 = ?');  values.push(theme.subColor3); }
  if (setClauses.length) {
    await db.execute(`UPDATE site_settings SET ${setClauses.join(', ')} WHERE id = 1`, values);
  }
  return getSiteSettings();
}

async function updateLogo(logoUrl) {
  await db.execute(`UPDATE site_settings SET logo_url = ? WHERE id = 1`, [logoUrl]);
  return getSiteSettings();
}

async function updateHeroBackground(heroBackgroundUrl) {
  await db.execute(`UPDATE site_settings SET hero_background_url = ? WHERE id = 1`, [heroBackgroundUrl]);
  return getSiteSettings();
}

module.exports = { getSiteSettings, updateTheme, updateLogo, updateHeroBackground, validateHexColor };
