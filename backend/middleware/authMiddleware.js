const jwt = require('jsonwebtoken');
const { findById, sanitize } = require('../lib/userStore');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다. backend/.env 파일에 JWT_SECRET를 추가하세요.');
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findById(payload.id);
    if (!user) {
      return res.status(401).json({ error: '존재하지 않는 사용자입니다.' });
    }
    if ((user.status || 'active') === 'inactive') {
      return res.status(403).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
    }
    req.user = sanitize(user);
    next();
  } catch (err) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

function requireAdminReauth(req, res, next) {
  const token = req.headers['x-admin-reauth-token'];
  if (!token) {
    return res.status(401).json({ error: '관리자 재인증 토큰이 필요합니다.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.purpose !== 'admin_reauth') {
      return res.status(401).json({ error: '유효하지 않은 재인증 토큰입니다.' });
    }
    next();
  } catch {
    return res.status(401).json({ error: '재인증 토큰이 만료되었거나 유효하지 않습니다.' });
  }
}

module.exports = { requireAuth, requireAdminReauth, JWT_SECRET };
