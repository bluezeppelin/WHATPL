'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../lib/db');

const admins = [
  { loginId: 'admin_hyunsu', name: '조현수', passwordEnv: 'ADMIN_HYUNSU_PASSWORD' },
  { loginId: 'admin_juyeon', name: '박주연', passwordEnv: 'ADMIN_JUYEON_PASSWORD' },
  { loginId: 'admin_inho', name: '최인호', passwordEnv: 'ADMIN_INHO_PASSWORD' },
  { loginId: 'admin_wonjun', name: '최원준', passwordEnv: 'ADMIN_WONJUN_PASSWORD' },
];

function getInitialPassword(admin) {
  return process.env[admin.passwordEnv] || process.env.ADMIN_INITIAL_PASSWORD;
}

async function seedAdmin(admin) {
  const [existing] = await db.execute(
    `SELECT id FROM users WHERE login_id = ?`,
    [admin.loginId]
  );

  if (existing.length) {
    await db.execute(
      `UPDATE users SET role = 'admin', status = 'active', name = COALESCE(name, ?), updated_at = NOW()
       WHERE login_id = ?`,
      [admin.name, admin.loginId]
    );
    console.log(`kept existing admin: ${admin.loginId}`);
    return;
  }

  const password = getInitialPassword(admin);
  if (!password) {
    throw new Error(`${admin.loginId} 생성용 비밀번호가 없습니다. ${admin.passwordEnv} 또는 ADMIN_INITIAL_PASSWORD 환경변수를 설정하세요.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.execute(
    `INSERT INTO users
       (id, login_id, password_hash, email, name, role, status, terms_agreed, privacy_agreed, agreed_at)
     VALUES (?, ?, ?, ?, ?, 'admin', 'active', 1, 1, NOW())`,
    [
      uuidv4(),
      admin.loginId,
      passwordHash,
      `${admin.loginId}@whatpl.local`,
      admin.name,
    ]
  );
  console.log(`created admin: ${admin.loginId}`);
}

async function main() {
  for (const admin of admins) {
    await seedAdmin(admin);
  }
  console.log('admin seed complete');
}

main()
  .then(() => db.end())
  .catch(async (err) => {
    console.error(err);
    try { await db.end(); } catch {}
    process.exit(1);
  });
