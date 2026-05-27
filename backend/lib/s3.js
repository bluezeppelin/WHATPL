const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
const PROFILES_DIR = path.join(UPLOADS_DIR, 'profiles');

// 업로드 폴더 자동 생성
[UPLOADS_DIR, AUDIO_DIR, COVERS_DIR, PROFILES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === 'audio' ? AUDIO_DIR : COVERS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const folder = file.fieldname === 'audio' ? 'audio' : 'covers';
    const filename = uuidv4() + ext;
    // key 형식을 S3와 동일하게 맞춰 routes/tracks.js 코드 재사용
    file.key = `${folder}/${filename}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      const allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4'];
      cb(null, allowed.includes(file.mimetype));
    } else if (file.fieldname === 'cover') {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      cb(null, allowed.includes(file.mimetype));
    } else {
      cb(null, false);
    }
  },
});

function getFileUrl(key) {
  // 로컬 정적 파일 URL로 변환
  return `http://localhost:${process.env.PORT || 5000}/uploads/${key}`;
}

async function deleteFromS3(key) {
  const filePath = path.join(UPLOADS_DIR, key.replace(/\//g, path.sep));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

const uploadProfile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PROFILES_DIR),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

module.exports = { upload, uploadProfile, getFileUrl, deleteFromS3 };
