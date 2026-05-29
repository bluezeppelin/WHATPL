const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// credentials 명시 안 함 → AWS SDK가 자동 chain 사용:
//   1) 환경변수 (AWS_ACCESS_KEY_ID/SECRET) — 로컬 개발용
//   2) ~/.aws/credentials
//   3) EC2 IAM Role (메타데이터 서비스) — 운영 환경용
const s3Config = { region: process.env.AWS_REGION };
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}
const s3 = new S3Client(s3Config);

const BUCKET = process.env.S3_BUCKET_NAME;
const CLOUDFRONT = process.env.CLOUDFRONT_DOMAIN;

const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const folder = file.fieldname === 'audio' ? 'audio' : 'covers';
      cb(null, `${folder}/${uuidv4()}${ext}`);
    },
  }),
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

const uploadProfile = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(null, `profiles/${uuidv4()}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const uploadSite = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(null, `site/${uuidv4()}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];
    cb(null, allowed.includes(file.mimetype));
  },
});

function getFileUrl(key) {
  if (CLOUDFRONT) return `https://${CLOUDFRONT}/${key}`;
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function deleteFromS3(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// 외부 커버 URL(CloudFront/S3)에서 우리 버킷 객체 key만 안전하게 추출.
// 우리 버킷/배포 도메인이 아니면 null → 임의 URL 프록시(SSRF) 차단.
function keyFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url;
  try { url = new URL(rawUrl); } catch { return null; }
  // _cors=1 등 쿼리스트링은 pathname에 포함되지 않으므로 자동 제거됨
  const objectKey = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!objectKey) return null;

  if (CLOUDFRONT && url.host === CLOUDFRONT) return objectKey;

  const region = process.env.AWS_REGION;
  // virtual-hosted style: bucket.s3.region.amazonaws.com/key
  if (url.host === `${BUCKET}.s3.${region}.amazonaws.com`) return objectKey;
  if (url.host === `${BUCKET}.s3.amazonaws.com`) return objectKey;
  // path style: s3.region.amazonaws.com/bucket/key
  if ((url.host === `s3.${region}.amazonaws.com` || url.host === 's3.amazonaws.com')
      && objectKey.startsWith(`${BUCKET}/`)) {
    return objectKey.slice(BUCKET.length + 1);
  }
  return null;
}

// 커버 색 추출 프록시용: 우리 버킷 객체를 스트림으로 반환. 허용되지 않은 URL이면 null.
async function getObjectByUrl(rawUrl) {
  const key = keyFromUrl(rawUrl);
  if (!key) return null;
  const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return { body: out.Body, contentType: out.ContentType, contentLength: out.ContentLength };
}

module.exports = { upload, uploadProfile, uploadSite, getFileUrl, deleteFromS3, getObjectByUrl };
