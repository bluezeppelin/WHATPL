const db = require('./db');
const { v4: uuidv4 } = require('uuid');

function rowToUser(row) {
  return {
    id: row.id,
    loginId: row.login_id,
    passwordHash: row.password_hash,
    email: row.email,
    name: row.name,
    birthDate: row.birth_date,
    phone: row.phone,
    profileImageUrl: row.profile_image_url,
    favoriteGenre: row.favorite_genre,
    artistName: row.artist_name,
    role: row.role,
    status: row.status,
    termsAgreed: !!row.terms_agreed,
    privacyAgreed: !!row.privacy_agreed,
    agreedAt: row.agreed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deactivatedAt: row.deactivated_at,
    deactivatedBy: row.deactivated_by,
  };
}

function sanitize(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

async function findById(id) {
  const [rows] = await db.execute(`SELECT * FROM users WHERE id = ?`, [id]);
  return rows.length ? rowToUser(rows[0]) : null;
}

async function findByLoginId(loginId) {
  const [rows] = await db.execute(`SELECT * FROM users WHERE login_id = ?`, [loginId]);
  return rows.length ? rowToUser(rows[0]) : null;
}

async function findByEmail(email) {
  const [rows] = await db.execute(`SELECT * FROM users WHERE email = ?`, [email]);
  return rows.length ? rowToUser(rows[0]) : null;
}

async function findByArtistName(artistName) {
  const [rows] = await db.execute(
    `SELECT * FROM users WHERE LOWER(artist_name) = LOWER(?)`, [artistName]
  );
  return rows.length ? rowToUser(rows[0]) : null;
}

async function findUserByNameAndEmail(name, email) {
  const [rows] = await db.execute(
    `SELECT * FROM users WHERE name = ? AND LOWER(email) = LOWER(?)`, [name, email]
  );
  return rows.length ? rowToUser(rows[0]) : null;
}

async function findUserByLoginIdAndEmail(loginId, email) {
  const [rows] = await db.execute(
    `SELECT * FROM users WHERE login_id = ? AND LOWER(email) = LOWER(?)`, [loginId, email]
  );
  return rows.length ? rowToUser(rows[0]) : null;
}

async function getAllUsers({ role, status } = {}) {
  let sql = `SELECT * FROM users WHERE 1=1`;
  const params = [];
  if (role)   { sql += ` AND role = ?`;   params.push(role); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY created_at ASC`;
  const [rows] = await db.execute(sql, params);
  return rows.map(rowToUser);
}

async function createUser(userData) {
  const id = userData.id || uuidv4();
  await db.execute(
    `INSERT INTO users
       (id, login_id, password_hash, email, name, birth_date, phone,
        profile_image_url, favorite_genre, artist_name, role, status,
        terms_agreed, privacy_agreed, agreed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      userData.loginId,
      userData.passwordHash,
      userData.email,
      userData.name || null,
      userData.birthDate || null,
      userData.phone || null,
      userData.profileImageUrl || null,
      userData.favoriteGenre || null,
      userData.artistName || null,
      userData.role || 'user',
      userData.status || 'active',
      userData.termsAgreed ? 1 : 0,
      userData.privacyAgreed ? 1 : 0,
      userData.agreedAt || null,
    ]
  );
  return findById(id);
}

async function updateUser(id, updates) {
  const colMap = {
    loginId: 'login_id', passwordHash: 'password_hash', email: 'email',
    name: 'name', birthDate: 'birth_date', phone: 'phone',
    profileImageUrl: 'profile_image_url', favoriteGenre: 'favorite_genre',
    artistName: 'artist_name', role: 'role', status: 'status',
    deactivatedAt: 'deactivated_at', deactivatedBy: 'deactivated_by',
  };
  const setClauses = [], values = [];
  for (const [jsKey, col] of Object.entries(colMap)) {
    if (updates[jsKey] !== undefined) { setClauses.push(`${col} = ?`); values.push(updates[jsKey]); }
  }
  if (!setClauses.length) return findById(id);
  values.push(id);
  await db.execute(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function isEmailTakenByOtherUser(email, userId) {
  const [rows] = await db.execute(
    `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?`, [email, userId]
  );
  return rows.length > 0;
}

async function isArtistNameTakenByOtherUser(artistName, userId) {
  const [rows] = await db.execute(
    `SELECT id FROM users WHERE LOWER(artist_name) = LOWER(?) AND id != ?`, [artistName, userId]
  );
  return rows.length > 0;
}

module.exports = {
  findById, findByLoginId, findByEmail, findByArtistName,
  findUserByNameAndEmail, findUserByLoginIdAndEmail,
  getAllUsers, createUser, updateUser, sanitize,
  isEmailTakenByOtherUser, isArtistNameTakenByOtherUser,
};
