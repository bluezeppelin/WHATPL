const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const {
  findByLoginId, findByEmail, findByArtistName, findById, createUser, updateUser, sanitize,
  isEmailTakenByOtherUser, isArtistNameTakenByOtherUser,
  findUserByNameAndEmail, findUserByLoginIdAndEmail,
} = require('../lib/userStore');
const { requireAuth, JWT_SECRET } = require('../middleware/authMiddleware');
const { uploadProfile, getFileUrl } = require('../lib/s3');

const router = express.Router();

// GET /api/auth/check-id?loginId=
router.get('/check-id', async (req, res) => {
  const { loginId } = req.query;
  if (!loginId) return res.status(400).json({ error: 'loginId가 필요합니다.' });
  try {
    const existing = await findByLoginId(loginId);
    res.json({ available: !existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/auth/check-artist-name?artistName=
router.get('/check-artist-name', async (req, res) => {
  const { artistName } = req.query;
  if (!artistName?.trim()) return res.json({ available: true });
  try {
    const existing = await findByArtistName(artistName.trim());
    res.json({ available: !existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  uploadProfile.single('profileImage')(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message || '이미지 업로드에 실패했습니다.' });
    try {
      const { loginId, password, email, name, birthDate, phone, favoriteGenre, artistName } = req.body;
      const termsAgreed = req.body.termsAgreed === 'true';
      const privacyAgreed = req.body.privacyAgreed === 'true';

      if (!loginId || !password || !email || !name) {
        return res.status(400).json({ error: 'loginId, password, email, name은 필수 항목입니다.' });
      }
      if (!termsAgreed || !privacyAgreed) {
        return res.status(400).json({ error: '필수 약관에 동의해야 회원가입할 수 있습니다.' });
      }
      if (await findByLoginId(loginId)) {
        return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
      }
      if (await findByEmail(email)) {
        return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
      }
      const trimmedArtistName = artistName?.trim() || '';
      if (trimmedArtistName && await findByArtistName(trimmedArtistName)) {
        return res.status(409).json({ error: '이미 사용 중인 아티스트명입니다.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();
      const profileImageUrl = req.file ? getFileUrl(req.file.key) : '';

      const newUser = await createUser({
        id: uuidv4(),
        loginId,
        passwordHash,
        email,
        name,
        birthDate: birthDate || '',
        phone: phone || '',
        profileImageUrl,
        favoriteGenre: favoriteGenre || '',
        artistName: trimmedArtistName,
        role: 'user',
        status: 'active',
        termsAgreed: true,
        privacyAgreed: true,
        agreedAt: now,
      });

      res.status(201).json({ user: sanitize(newUser) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '회원가입에 실패했습니다.' });
    }
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.status(400).json({ error: 'loginId와 password는 필수 항목입니다.' });
  }
  try {
    const user = await findByLoginId(loginId);
    if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

    if ((user.status || 'active') === 'inactive') {
      return res.status(403).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req, res) => {
  const { user } = req;
  const { email, name, birthDate, phone, profileImageUrl, favoriteGenre, artistName } = req.body;
  try {
    if (email !== undefined && email !== user.email) {
      if (await isEmailTakenByOtherUser(email, user.id)) {
        return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
      }
    }
    const trimmedArtistName = artistName !== undefined ? (artistName?.trim() ?? '') : undefined;
    if (trimmedArtistName !== undefined && trimmedArtistName !== '' &&
        trimmedArtistName.toLowerCase() !== (user.artistName || '').toLowerCase()) {
      if (await isArtistNameTakenByOtherUser(trimmedArtistName, user.id)) {
        return res.status(409).json({ error: '이미 사용 중인 아티스트명입니다.' });
      }
    }

    const ALLOWED = ['email', 'name', 'birthDate', 'phone', 'profileImageUrl', 'favoriteGenre'];
    const updates = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (trimmedArtistName !== undefined) updates.artistName = trimmedArtistName;

    const updated = await updateUser(user.id, updates);
    res.json({ user: sanitize(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/auth/find-id
router.post('/find-id', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: '이름과 이메일을 모두 입력해주세요.' });
  }
  try {
    const user = await findUserByNameAndEmail(name.trim(), email.trim());
    if (!user) return res.status(404).json({ message: '일치하는 계정을 찾을 수 없습니다.' });
    res.json({ message: '일치하는 계정을 찾았습니다.', loginId: user.loginId, status: user.status || 'active' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { loginId, email, newPassword, confirmPassword } = req.body;
  if (!loginId || !email || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: '모든 항목을 입력해주세요.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: '새 비밀번호는 8자 이상이어야 합니다.' });
  }
  try {
    const user = await findUserByLoginIdAndEmail(loginId.trim(), email.trim());
    if (!user) return res.status(404).json({ message: '입력한 정보와 일치하는 계정을 찾을 수 없습니다.' });
    if ((user.status || 'active') === 'inactive') {
      return res.status(403).json({ message: '비활성화된 계정은 비밀번호를 초기화할 수 없습니다. 관리자에게 문의하세요.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updateUser(user.id, { passwordHash });
    res.json({ message: '비밀번호가 초기화되었습니다. 새 비밀번호로 로그인하세요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/auth/me/profile-image
router.post('/me/profile-image', requireAuth, (req, res) => {
  uploadProfile.single('profileImage')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || '업로드에 실패했습니다.' });
    if (!req.file) return res.status(400).json({ message: '이미지 파일을 선택해주세요. (jpg/png/webp)' });
    try {
      const profileImageUrl = getFileUrl(req.file.key);
      const updated = await updateUser(req.user.id, { profileImageUrl });
      res.json({ user: sanitize(updated) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '서버 오류' });
    }
  });
});

// DELETE /api/auth/me
router.delete('/me', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: '비밀번호를 입력해주세요.' });
  try {
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    if (user.role === 'admin') {
      return res.status(403).json({ message: '관리자 계정은 회원탈퇴할 수 없습니다.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
    const { deleteUserAccount } = require('../lib/userDeleteService');
    await deleteUserAccount(user.id);
    res.json({ message: '회원 탈퇴가 완료되었습니다.' });
  } catch (err) {
    console.error('[deleteAccount]', err);
    res.status(500).json({ message: '탈퇴 처리 중 오류가 발생했습니다.' });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: '모든 항목을 입력해주세요.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: '새 비밀번호는 8자 이상이어야 합니다.' });
  }
  try {
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updateUser(user.id, { passwordHash });
    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
