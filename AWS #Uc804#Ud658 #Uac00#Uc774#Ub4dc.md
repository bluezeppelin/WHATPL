# WHATPL — AWS 배포 가이드

> **현재 상태**: Node.js + Express 백엔드 / React + Vite 프론트엔드 / JSON 파일 DB / 로컬 파일 저장  
> **목표 상태**: EC2(백엔드) + RDS MySQL(DB) + S3(파일) + CloudFront(CDN) + S3/Amplify(프론트)

---

## 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [사전 준비](#2-사전-준비)
3. [S3 버킷 설정 (파일 저장)](#3-s3-버킷-설정)
4. [RDS MySQL 설정 (데이터베이스)](#4-rds-mysql-설정)
5. [SQL 스키마 생성](#5-sql-스키마-생성)
6. [백엔드 코드 수정](#6-백엔드-코드-수정)
7. [EC2 인스턴스 설정 (백엔드 서버)](#7-ec2-인스턴스-설정)
8. [프론트엔드 배포](#8-프론트엔드-배포)
9. [CloudFront 설정 (선택)](#9-cloudfront-설정-선택)
10. [환경변수 정리](#10-환경변수-정리)
11. [보안 체크리스트](#11-보안-체크리스트)
12. [배포 후 테스트](#12-배포-후-테스트)

---

## 1. 전체 아키텍처

```
사용자 브라우저
    │
    ├─── 프론트엔드 (React 빌드)
    │         S3 정적 호스팅 or AWS Amplify
    │         도메인: https://your-domain.com
    │
    └─── API 요청 (/api/*)
              │
         EC2 (Node.js + Express)
         포트 5000, Nginx 리버스 프록시
              │
       ┌──────┴──────┐
       │             │
   RDS MySQL      S3 버킷
   (데이터 저장)   (오디오/이미지)
                    │
               CloudFront CDN (선택)
               빠른 파일 서빙
```

### 사용할 AWS 서비스

| 서비스 | 용도 | 예상 비용 (월) |
|--------|------|---------------|
| EC2 t3.small | 백엔드 서버 | ~$15 |
| RDS db.t3.micro | MySQL 데이터베이스 | ~$15 |
| S3 | 오디오/이미지 저장 | ~$1~5 (용량에 따라) |
| CloudFront | 파일 CDN (선택) | ~$1~3 |
| S3 정적 호스팅 | 프론트엔드 | 거의 무료 |

---

## 2. 사전 준비

### 2-1. AWS 계정 및 IAM 설정

1. **AWS 콘솔** 접속 → IAM → 사용자 생성
2. 권한 정책 연결:
   - `AmazonS3FullAccess`
   - `AmazonRDSFullAccess` (RDS 직접 관리 시)
3. **Access Key ID / Secret Access Key** 발급 후 안전하게 보관

### 2-2. AWS CLI 설치 (로컬 작업용)

```bash
# Windows
winget install Amazon.AWSCLI

# 설정
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region name: ap-northeast-2
# Default output format: json
```

### 2-3. 리전 선택

모든 서비스를 **서울 리전 (`ap-northeast-2`)** 으로 통일합니다.  
같은 리전에 있어야 EC2 ↔ RDS ↔ S3 통신 비용 절감 및 속도 향상.

---

## 3. S3 버킷 설정

현재 `backend/lib/s3.js`는 로컬 파일 저장 방식입니다.  
`package.json`에 이미 `@aws-sdk/client-s3`, `multer-s3`가 포함되어 있으므로 설정만 변경하면 됩니다.

### 3-1. S3 버킷 생성

```
AWS 콘솔 → S3 → 버킷 만들기
- 버킷 이름: whatpl-media (전 세계 유일한 이름으로)
- 리전: 아시아 태평양(서울) ap-northeast-2
- 퍼블릭 액세스 차단: 해제 (퍼블릭 읽기 허용할 경우)
- 버전 관리: 비활성화 (선택)
```

### 3-2. 버킷 정책 설정 (퍼블릭 읽기 허용)

`S3 콘솔 → 버킷 → 권한 → 버킷 정책`에 아래 JSON 입력:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::whatpl-media/*"
    }
  ]
}
```

> CloudFront를 사용할 경우 버킷을 비공개로 두고 CloudFront OAC 방식을 사용합니다. (9장 참고)

### 3-3. CORS 설정

`S3 콘솔 → 버킷 → 권한 → CORS(Cross-origin 리소스 공유)`:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://your-domain.com"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 3-4. 폴더 구조 (S3 prefix)

```
whatpl-media/
├── audio/          # 오디오 파일 (.mp3, .wav 등)
├── covers/         # 앨범 커버 이미지
├── profiles/       # 사용자 프로필 이미지
└── site/           # 로고, 히어로 배경 이미지
```

### 3-5. 기존 site/ 이미지 S3에 업로드

```bash
# 로컬 uploads/site 폴더를 S3에 업로드
aws s3 sync ./backend/uploads/site s3://whatpl-media/site/ --acl public-read
```

---

## 4. RDS MySQL 설정

### 4-1. RDS 인스턴스 생성

```
AWS 콘솔 → RDS → 데이터베이스 생성
- 엔진: MySQL 8.0
- 템플릿: 프리 티어 (개발) or 프로덕션
- DB 인스턴스 식별자: whatpl-db
- 마스터 사용자 이름: admin
- 마스터 암호: (강력한 비밀번호 설정)
- 인스턴스 클래스: db.t3.micro (개발) / db.t3.small (운영)
- 스토리지: 20GB gp3
- VPC: EC2와 동일한 VPC 선택
- 퍼블릭 액세스: 아니요 (EC2와 같은 VPC 내부 통신)
  ※ 개발 중 로컬에서 접속하려면 일시적으로 예로 설정
- 초기 데이터베이스 이름: whatpl
```

### 4-2. 보안 그룹 설정

RDS 보안 그룹에서 EC2의 보안 그룹으로부터 3306 포트 인바운드 허용:

```
인바운드 규칙 추가:
- 유형: MySQL/Aurora
- 프로토콜: TCP
- 포트: 3306
- 소스: EC2 보안 그룹 ID (sg-xxxxxxxxx)
```

### 4-3. 엔드포인트 확인

생성 완료 후 `RDS 콘솔 → 데이터베이스 → 연결 & 보안` 탭에서 엔드포인트 확인:
```
whatpl-db.xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com
```

---

## 5. SQL 스키마 생성

MySQL 클라이언트(DBeaver, MySQL Workbench, CLI)로 RDS에 접속 후 실행합니다.

```bash
# MySQL CLI로 접속 (로컬에서 퍼블릭 액세스 허용 시)
mysql -h whatpl-db.xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com \
      -u admin -p whatpl
```

```sql
-- ──────────────────────────────────────────
-- 1. users
-- ──────────────────────────────────────────
CREATE TABLE users (
  id               VARCHAR(36)   PRIMARY KEY,
  login_id         VARCHAR(50)   NOT NULL UNIQUE,
  password_hash    VARCHAR(255)  NOT NULL,
  email            VARCHAR(100)  NOT NULL UNIQUE,
  name             VARCHAR(50),
  birth_date       VARCHAR(20),
  phone            VARCHAR(20),
  profile_image_url TEXT,
  favorite_genre   VARCHAR(50),
  artist_name      VARCHAR(100),
  role             ENUM('user','creator','admin') NOT NULL DEFAULT 'user',
  status           ENUM('active','inactive')      NOT NULL DEFAULT 'active',
  terms_agreed     TINYINT(1) DEFAULT 1,
  privacy_agreed   TINYINT(1) DEFAULT 1,
  agreed_at        DATETIME,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deactivated_at   DATETIME,
  deactivated_by   VARCHAR(36)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ──────────────────────────────────────────
-- 2. tracks
-- ──────────────────────────────────────────
CREATE TABLE tracks (
  id                  VARCHAR(36)  PRIMARY KEY,
  title               VARCHAR(200) NOT NULL,
  artist              VARCHAR(100),
  genre               VARCHAR(50),
  description         TEXT,
  audio_url           TEXT,
  audio_key           VARCHAR(300),
  cover_url           TEXT,
  cover_key           VARCHAR(300),
  duration            INT          DEFAULT 0,
  plays               INT          DEFAULT 0,
  likes               INT          DEFAULT 0,
  uploaded_by_user_id VARCHAR(36),
  status              ENUM('active','deleted','suspended') NOT NULL DEFAULT 'active',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at          DATETIME,
  deleted_by          VARCHAR(50),
  delete_reason       TEXT,
  suspended_at        DATETIME,
  suspended_by        VARCHAR(50),
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ──────────────────────────────────────────
-- 3. playlists + playlist_tracks
-- ──────────────────────────────────────────
CREATE TABLE playlists (
  id         VARCHAR(36)  PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  name       VARCHAR(200) NOT NULL,
  is_default TINYINT(1)   DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- trackIds 배열 → 관계 테이블
CREATE TABLE playlist_tracks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id VARCHAR(36) NOT NULL,
  track_id    VARCHAR(36) NOT NULL,
  position    INT         NOT NULL DEFAULT 0,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id)    REFERENCES tracks(id)    ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- 4. liked_tracks
-- ──────────────────────────────────────────
CREATE TABLE liked_tracks (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  track_id   VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_track (user_id, track_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- 5. followed_artists
-- ──────────────────────────────────────────
CREATE TABLE followed_artists (
  id          VARCHAR(36)  PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  artist_name VARCHAR(100) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_artist (user_id, artist_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- 6. notifications
-- ──────────────────────────────────────────
CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  type       VARCHAR(60)  NOT NULL,
  title      VARCHAR(200),
  message    TEXT,
  link       VARCHAR(300),
  is_read    TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- 7. creator_requests
-- ──────────────────────────────────────────
CREATE TABLE creator_requests (
  id          VARCHAR(36) PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL,
  login_id    VARCHAR(50),
  name        VARCHAR(50),
  artist_name VARCHAR(100),
  message     TEXT,
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewed_by VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ──────────────────────────────────────────
-- 8. recently_played
-- ──────────────────────────────────────────
CREATE TABLE recently_played (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  track_id   VARCHAR(36) NOT NULL,
  played_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- 9. player_sessions + player_queue
-- ──────────────────────────────────────────
CREATE TABLE player_sessions (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL UNIQUE,
  track_id        VARCHAR(36),
  current_time    FLOAT  DEFAULT 0,
  current_index   INT    DEFAULT 0,
  queue_type      VARCHAR(50),
  queue_source_id VARCHAR(36),
  repeat_mode     ENUM('none','one','all') DEFAULT 'none',
  shuffle         TINYINT(1) DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- queueTrackIds 배열 → 관계 테이블
CREATE TABLE player_queue (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  track_id   VARCHAR(36) NOT NULL,
  position   INT         NOT NULL DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES player_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id)   REFERENCES tracks(id)          ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- 10. site_settings (단일 행 테이블)
-- ──────────────────────────────────────────
CREATE TABLE site_settings (
  id                  INT PRIMARY KEY DEFAULT 1,
  site_name           VARCHAR(100),
  logo_url            TEXT,
  hero_background_url TEXT,
  main_color          VARCHAR(20),
  sub_color1          VARCHAR(20),
  sub_color2          VARCHAR(20),
  sub_color3          VARCHAR(20),
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 기본값 삽입
INSERT INTO site_settings (id, site_name, main_color, sub_color1, sub_color2, sub_color3)
VALUES (1, 'WHATPL', '#7B2FF7', '#EC4899', '#A78BFA', '#F472B6');

-- ──────────────────────────────────────────
-- 11. track_delete_requests
-- ──────────────────────────────────────────
CREATE TABLE track_delete_requests (
  id               VARCHAR(36) PRIMARY KEY,
  track_id         VARCHAR(36),
  creator_user_id  VARCHAR(36),
  creator_login_id VARCHAR(50),
  artist_name      VARCHAR(100),
  track_title      VARCHAR(200),
  reason           TEXT,
  status           ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by      VARCHAR(50),
  reviewed_at      DATETIME,
  reject_reason    TEXT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ──────────────────────────────────────────
-- 12. hard_delete_logs
-- ──────────────────────────────────────────
CREATE TABLE hard_delete_logs (
  id         VARCHAR(36) PRIMARY KEY,
  track_id   VARCHAR(36),
  title      VARCHAR(200),
  artist     VARCHAR(100),
  deleted_by VARCHAR(50),
  reason     TEXT,
  deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ──────────────────────────────────────────
-- 초기 admin 데이터 삽입
-- ──────────────────────────────────────────
INSERT INTO users (id, login_id, password_hash, email, name, role, status, terms_agreed, privacy_agreed,
                   agreed_at, created_at, updated_at)
VALUES
  ('f813fa12-7dab-4f96-8d81-a8f207fe1418', 'admin_hyunsu',
   '$2b$10$zg4wUdfoBgNWRhFqzw1st.BwQUCIG29Zl7zouPJzYo5CYGVJ3bS4q',
   'admin_hyunsu@naver.com', '조현수', 'admin', 'active', 1, 1,
   '2026-05-27 02:36:43', '2026-05-27 02:36:43', '2026-05-27 07:25:47'),
  ('e50a988b-98bf-4ccc-af4a-b81ed07d70ed', 'admin_juyeon',
   '$2b$10$n/Q1VYEt9DL/QKH/7dbXe.qFhVR.2I7MVl9eWkwQ8CgR4ct2A.1am',
   'admin_juyeon@google.com', '박주연', 'admin', 'active', 1, 1,
   '2026-05-27 02:36:43', '2026-05-27 02:36:43', '2026-05-27 03:33:24'),
  ('046f1c80-5e37-4481-9b7c-4922f34c5678', 'admin_inho',
   '$2b$10$Xo7GpWGUpZE2SeGo.hqL0uG8YjKt4/NaZvZdq2oIEIEIj/MWLOM7S',
   'admin_inho@google.com', '최인호', 'admin', 'active', 1, 1,
   '2026-05-27 02:36:43', '2026-05-27 02:36:43', '2026-05-27 03:33:37'),
  ('49c5e3eb-f9b5-4094-b88a-8e4b8b3a5efb', 'admin_wonjun',
   '$2b$10$I3nCz.8e2xHGj76uLJ0pL.XyK0FxE2jO..KP2U/TzPqthwOkbzPsu',
   'admin_wonjun@google.com', '최원준', 'admin', 'active', 1, 1,
   '2026-05-27 02:36:43', '2026-05-27 02:36:43', '2026-05-27 03:33:51');
```

---

## 6. 백엔드 코드 수정

### 6-1. S3 실제 연동 (`backend/lib/s3.js` 교체)

현재 `s3.js`는 로컬 디스크에 저장합니다. 아래 코드로 **전체 교체**합니다.

```js
// backend/lib/s3.js
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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
      const filename = uuidv4() + ext;
      file.key = `${folder}/${filename}`;
      cb(null, file.key);
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
      const key = `profiles/${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, key);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
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

module.exports = { upload, uploadProfile, getFileUrl, deleteFromS3 };
```

### 6-2. DB 연결 설정 추가 (`backend/lib/db.js` 신규 생성)

```js
// backend/lib/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
});

module.exports = pool;
```

```bash
# mysql2 패키지 설치
cd backend
npm install mysql2
```

### 6-3. store.js 교체 (tracks) — 예시

`backend/lib/store.js`의 JSON 파일 읽기/쓰기를 DB 쿼리로 교체합니다.

```js
// backend/lib/store.js (DB 버전)
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

async function getAllTracks() {
  const [rows] = await db.execute(
    `SELECT * FROM tracks
     WHERE status NOT IN ('deleted', 'suspended')
     ORDER BY created_at DESC`
  );
  return rows.map(rowToTrack);
}

async function getAllTracksIncludingDeleted() {
  const [rows] = await db.execute(
    `SELECT * FROM tracks ORDER BY created_at DESC`
  );
  return rows.map(rowToTrack);
}

async function getTrackById(id) {
  const [rows] = await db.execute(`SELECT * FROM tracks WHERE id = ?`, [id]);
  return rows.length ? rowToTrack(rows[0]) : null;
}

async function createTrack({ title, artist, genre, description, audioUrl, audioKey, coverUrl, coverKey, duration, uploadedByUserId }) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO tracks
       (id, title, artist, genre, description, audio_url, audio_key,
        cover_url, cover_key, duration, plays, likes, uploaded_by_user_id, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,0,0,?,'active',NOW())`,
    [id, title, artist || '알 수 없는 아티스트', genre || '', description || '',
     audioUrl, audioKey, coverUrl, coverKey, duration || 0, uploadedByUserId || null]
  );
  return getTrackById(id);
}

async function incrementPlays(id) {
  await db.execute(`UPDATE tracks SET plays = plays + 1 WHERE id = ?`, [id]);
}

async function updateTrack(id, fields) {
  const allowed = ['title', 'artist', 'genre', 'description', 'cover_url', 'cover_key'];
  const setClauses = [];
  const values = [];
  const fieldMap = { title: 'title', artist: 'artist', genre: 'genre',
                     description: 'description', coverUrl: 'cover_url', coverKey: 'cover_key' };
  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (fields[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = ?`);
      values.push(fields[jsKey]);
    }
  }
  if (!setClauses.length) return getTrackById(id);
  values.push(id);
  await db.execute(`UPDATE tracks SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return getTrackById(id);
}

async function softDeleteTrack(id, deletedBy, deleteReason) {
  await db.execute(
    `UPDATE tracks SET status='deleted', deleted_at=NOW(), deleted_by=?, delete_reason=? WHERE id=?`,
    [deletedBy || null, deleteReason || '', id]
  );
  return getTrackById(id);
}

async function deleteTrack(id) {
  const track = await getTrackById(id);
  if (!track) return null;
  await db.execute(`DELETE FROM tracks WHERE id = ?`, [id]);
  return track;
}

async function suspendTracksByUser(userId, suspendedBy) {
  await db.execute(
    `UPDATE tracks SET status='suspended', suspended_at=NOW(), suspended_by=?
     WHERE uploaded_by_user_id=? AND status NOT IN ('deleted','suspended')`,
    [suspendedBy, userId]
  );
}

async function restoreTracksByUser(userId) {
  await db.execute(
    `UPDATE tracks SET status='active', suspended_at=NULL, suspended_by=NULL
     WHERE uploaded_by_user_id=? AND status='suspended'`,
    [userId]
  );
}

// DB 컬럼명(snake_case) → JS 객체(camelCase) 변환
function rowToTrack(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    genre: row.genre,
    description: row.description,
    audioUrl: row.audio_url,
    audioKey: row.audio_key,
    coverUrl: row.cover_url,
    coverKey: row.cover_key,
    duration: row.duration,
    plays: row.plays,
    likes: row.likes,
    uploadedByUserId: row.uploaded_by_user_id,
    status: row.status,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deleteReason: row.delete_reason,
  };
}

module.exports = {
  getAllTracks, getAllTracksIncludingDeleted, getTrackById,
  createTrack, updateTrack, incrementPlays,
  deleteTrack, softDeleteTrack, suspendTracksByUser, restoreTracksByUser,
};
```

> **나머지 store 파일들** (`userStore.js`, `playlistStore.js`, `notificationStore.js` 등)도  
> 같은 패턴으로 JSON 읽기/쓰기 → `db.execute()` 쿼리로 교체합니다.

---

### 6-3-1. userStore.js (DB 버전)

```js
// backend/lib/userStore.js
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
  const { passwordHash, ...rest } = user;
  return rest;
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
  const [rows] = await db.execute(`SELECT * FROM users WHERE artist_name = ?`, [artistName]);
  return rows.length ? rowToUser(rows[0]) : null;
}

async function getAllUsers({ role, status } = {}) {
  let sql = `SELECT * FROM users WHERE 1=1`;
  const params = [];
  if (role)   { sql += ` AND role = ?`;   params.push(role); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY created_at DESC`;
  const [rows] = await db.execute(sql, params);
  return rows.map(rowToUser);
}

async function createUser({ loginId, passwordHash, email, name, birthDate, phone,
                            favoriteGenre, artistName, role, termsAgreed, privacyAgreed, agreedAt }) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO users
       (id, login_id, password_hash, email, name, birth_date, phone,
        favorite_genre, artist_name, role, terms_agreed, privacy_agreed, agreed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, loginId, passwordHash, email, name || null, birthDate || null, phone || null,
     favoriteGenre || null, artistName || null, role || 'user',
     termsAgreed ? 1 : 0, privacyAgreed ? 1 : 0, agreedAt || null]
  );
  return findById(id);
}

async function updateUser(id, updates) {
  const colMap = {
    name: 'name', email: 'email', phone: 'phone', birthDate: 'birth_date',
    favoriteGenre: 'favorite_genre', artistName: 'artist_name',
    profileImageUrl: 'profile_image_url', role: 'role', status: 'status',
    passwordHash: 'password_hash', deactivatedAt: 'deactivated_at', deactivatedBy: 'deactivated_by',
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

async function isLoginIdTaken(loginId) {
  const [rows] = await db.execute(`SELECT id FROM users WHERE login_id = ?`, [loginId]);
  return rows.length > 0;
}

async function isEmailTakenByOtherUser(email, excludeId) {
  const [rows] = await db.execute(`SELECT id FROM users WHERE email = ? AND id != ?`, [email, excludeId]);
  return rows.length > 0;
}

async function isArtistNameTakenByOtherUser(artistName, excludeId) {
  const [rows] = await db.execute(`SELECT id FROM users WHERE artist_name = ? AND id != ?`, [artistName, excludeId]);
  return rows.length > 0;
}

module.exports = {
  findById, findByLoginId, findByEmail, findByArtistName,
  getAllUsers, createUser, updateUser, sanitize,
  isLoginIdTaken, isEmailTakenByOtherUser, isArtistNameTakenByOtherUser,
};
```

---

### 6-3-2. playlistStore.js (DB 버전)

```js
// backend/lib/playlistStore.js
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function getPlaylistById(id) {
  const [rows] = await db.execute(`SELECT * FROM playlists WHERE id = ?`, [id]);
  if (!rows.length) return null;
  const pl = rows[0];
  const [tracks] = await db.execute(
    `SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC`, [id]
  );
  pl.trackIds = tracks.map(r => r.track_id);
  return pl;
}

async function getPlaylistsByUserId(userId) {
  const [playlists] = await db.execute(
    `SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at ASC`, [userId]
  );
  for (const pl of playlists) {
    const [tracks] = await db.execute(
      `SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC`, [pl.id]
    );
    pl.trackIds = tracks.map(r => r.track_id);
  }
  return playlists;
}

async function getDefaultPlaylistByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM playlists WHERE user_id = ? AND is_default = 1`, [userId]
  );
  if (!rows.length) return null;
  return getPlaylistById(rows[0].id);
}

async function ensureDefaultPlaylist(userId) {
  const existing = await getDefaultPlaylistByUserId(userId);
  if (existing) return existing;
  const id = uuidv4();
  await db.execute(
    `INSERT INTO playlists (id, user_id, name, is_default) VALUES (?, ?, '좋아하는 음악', 1)`,
    [id, userId]
  );
  return getPlaylistById(id);
}

async function createPlaylist(userId, name) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO playlists (id, user_id, name, is_default) VALUES (?, ?, ?, 0)`,
    [id, userId, name]
  );
  return getPlaylistById(id);
}

async function addTrackToPlaylist(playlistId, trackId) {
  const [existing] = await db.execute(
    `SELECT id FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`, [playlistId, trackId]
  );
  if (existing.length) return getPlaylistById(playlistId);
  const [maxPos] = await db.execute(
    `SELECT MAX(position) as maxPos FROM playlist_tracks WHERE playlist_id = ?`, [playlistId]
  );
  const position = (maxPos[0].maxPos ?? -1) + 1;
  await db.execute(
    `INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)`,
    [playlistId, trackId, position]
  );
  return getPlaylistById(playlistId);
}

async function removeTrackFromPlaylist(playlistId, trackId) {
  await db.execute(
    `DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`, [playlistId, trackId]
  );
  return getPlaylistById(playlistId);
}

async function updatePlaylistName(id, name) {
  await db.execute(`UPDATE playlists SET name = ? WHERE id = ?`, [name, id]);
  return getPlaylistById(id);
}

async function deletePlaylist(id) {
  await db.execute(`DELETE FROM playlists WHERE id = ?`, [id]);
}

module.exports = {
  getPlaylistById, getPlaylistsByUserId, getDefaultPlaylistByUserId,
  ensureDefaultPlaylist, createPlaylist,
  addTrackToPlaylist, removeTrackFromPlaylist, updatePlaylistName, deletePlaylist,
};
```

---

### 6-3-3. likedTrackStore.js (DB 버전)

```js
// backend/lib/likedTrackStore.js
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function getLikedTrackIdsByUser(userId) {
  const [rows] = await db.execute(
    `SELECT track_id FROM liked_tracks WHERE user_id = ? ORDER BY created_at DESC`, [userId]
  );
  return rows.map(r => r.track_id);
}

async function isLiked(userId, trackId) {
  const [rows] = await db.execute(
    `SELECT id FROM liked_tracks WHERE user_id = ? AND track_id = ?`, [userId, trackId]
  );
  return rows.length > 0;
}

async function likeTrack(userId, trackId) {
  const id = uuidv4();
  await db.execute(
    `INSERT IGNORE INTO liked_tracks (id, user_id, track_id) VALUES (?, ?, ?)`,
    [id, userId, trackId]
  );
  await db.execute(`UPDATE tracks SET likes = likes + 1 WHERE id = ?`, [trackId]);
}

async function unlikeTrack(userId, trackId) {
  const [result] = await db.execute(
    `DELETE FROM liked_tracks WHERE user_id = ? AND track_id = ?`, [userId, trackId]
  );
  if (result.affectedRows > 0) {
    await db.execute(`UPDATE tracks SET likes = GREATEST(likes - 1, 0) WHERE id = ?`, [trackId]);
  }
}

module.exports = { getLikedTrackIdsByUser, isLiked, likeTrack, unlikeTrack };
```

---

### 6-3-4. followedArtistStore.js (DB 버전)

```js
// backend/lib/followedArtistStore.js
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function findByUserAndArtist(userId, artistName) {
  const [rows] = await db.execute(
    `SELECT * FROM followed_artists WHERE user_id = ? AND LOWER(artist_name) = LOWER(?)`,
    [userId, artistName]
  );
  return rows.length ? rows[0] : null;
}

async function getFollowedByUser(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM followed_artists WHERE user_id = ? ORDER BY created_at DESC`, [userId]
  );
  return rows;
}

async function getFollowersByArtistName(artistName) {
  const [rows] = await db.execute(
    `SELECT * FROM followed_artists WHERE LOWER(artist_name) = LOWER(?)`, [artistName]
  );
  return rows;
}

async function addFollow({ id, userId, artistName, createdAt }) {
  await db.execute(
    `INSERT IGNORE INTO followed_artists (id, user_id, artist_name) VALUES (?, ?, ?)`,
    [id || uuidv4(), userId, artistName]
  );
  return findByUserAndArtist(userId, artistName);
}

async function removeFollow(userId, artistName) {
  await db.execute(
    `DELETE FROM followed_artists WHERE user_id = ? AND LOWER(artist_name) = LOWER(?)`,
    [userId, artistName]
  );
}

module.exports = { findByUserAndArtist, getFollowedByUser, getFollowersByArtistName, addFollow, removeFollow };
```

---

### 6-3-5. notificationStore.js (DB 버전)

```js
// backend/lib/notificationStore.js
const db = require('./db');

async function getByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`, [userId]
  );
  return rows;
}

async function createNotification(userId, { type, title, message, link }) {
  await db.execute(
    `INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title || null, message || null, link || null]
  );
}

async function markAllRead(userId) {
  await db.execute(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
}

async function getUnreadCount(userId) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0`, [userId]
  );
  return rows[0].cnt;
}

module.exports = { getByUserId, createNotification, markAllRead, getUnreadCount };
```

---

### 6-3-6. recentlyPlayedStore.js (DB 버전)

```js
// backend/lib/recentlyPlayedStore.js
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const MAX_HISTORY = 50;

async function getByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM recently_played WHERE user_id = ? ORDER BY played_at DESC LIMIT ?`,
    [userId, MAX_HISTORY]
  );
  return rows;
}

async function addRecentlyPlayed(userId, trackId) {
  // 동일 트랙이 이미 있으면 삭제 후 재삽입 (최신 순 유지)
  await db.execute(
    `DELETE FROM recently_played WHERE user_id = ? AND track_id = ?`, [userId, trackId]
  );
  await db.execute(
    `INSERT INTO recently_played (id, user_id, track_id, played_at) VALUES (?, ?, ?, NOW())`,
    [uuidv4(), userId, trackId]
  );
  // MAX_HISTORY 초과 항목 삭제
  await db.execute(
    `DELETE FROM recently_played
     WHERE user_id = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM recently_played WHERE user_id = ? ORDER BY played_at DESC LIMIT ?
         ) sub
       )`,
    [userId, userId, MAX_HISTORY]
  );
}

module.exports = { getByUserId, addRecentlyPlayed };
```

---

### 6-3-7. playerSessionStore.js (DB 버전)

```js
// backend/lib/playerSessionStore.js
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function getByUser(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM player_sessions WHERE user_id = ?`, [userId]
  );
  if (!rows.length) return null;
  const session = rows[0];
  const [queue] = await db.execute(
    `SELECT track_id FROM player_queue WHERE session_id = ? ORDER BY position ASC`,
    [session.id]
  );
  session.queueTrackIds = queue.map(r => r.track_id);
  return session;
}

async function upsert(userId, fields) {
  const existing = await getByUser(userId);
  const id = existing ? existing.id : uuidv4();

  if (existing) {
    const colMap = {
      trackId: 'track_id', currentTime: 'current_time', currentIndex: 'current_index',
      queueType: 'queue_type', queueSourceId: 'queue_source_id',
      repeatMode: 'repeat_mode', shuffle: 'shuffle',
    };
    const setClauses = [], values = [];
    for (const [jsKey, col] of Object.entries(colMap)) {
      if (fields[jsKey] !== undefined) {
        setClauses.push(`${col} = ?`);
        values.push(jsKey === 'shuffle' ? (fields[jsKey] ? 1 : 0) : fields[jsKey]);
      }
    }
    if (setClauses.length) {
      values.push(id);
      await db.execute(`UPDATE player_sessions SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }
  } else {
    await db.execute(
      `INSERT INTO player_sessions
         (id, user_id, track_id, current_time, current_index, queue_type, queue_source_id, repeat_mode, shuffle)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, userId,
       fields.trackId || null, fields.currentTime || 0, fields.currentIndex || 0,
       fields.queueType || null, fields.queueSourceId || null,
       fields.repeatMode || 'none', fields.shuffle ? 1 : 0]
    );
  }

  // queueTrackIds가 전달된 경우 player_queue 전체 교체
  if (Array.isArray(fields.queueTrackIds)) {
    await db.execute(`DELETE FROM player_queue WHERE session_id = ?`, [id]);
    for (let i = 0; i < fields.queueTrackIds.length; i++) {
      await db.execute(
        `INSERT INTO player_queue (session_id, track_id, position) VALUES (?, ?, ?)`,
        [id, fields.queueTrackIds[i], i]
      );
    }
  }

  return getByUser(userId);
}

async function removeTrackFromSessions(trackId) {
  // 현재 재생 트랙이 해당 트랙이면 null로 초기화
  await db.execute(
    `UPDATE player_sessions SET track_id = NULL WHERE track_id = ?`, [trackId]
  );
  // 큐에서 해당 트랙 제거
  await db.execute(`DELETE FROM player_queue WHERE track_id = ?`, [trackId]);
}

module.exports = { upsert, getByUser, removeTrackFromSessions };
```

---

### 6-3-8. creatorRequestStore.js (DB 버전)

```js
// backend/lib/creatorRequestStore.js
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

function rowToRequest(row) {
  return {
    id: row.id,
    userId: row.user_id,
    loginId: row.login_id,
    name: row.name,
    artistName: row.artist_name,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

async function findPendingByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM creator_requests WHERE user_id = ? AND status = 'pending'`, [userId]
  );
  return rows.length ? rowToRequest(rows[0]) : null;
}

async function getLatestByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM creator_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId]
  );
  return rows.length ? rowToRequest(rows[0]) : null;
}

async function createRequest({ id, userId, loginId, name, artistName, message }) {
  const reqId = id || uuidv4();
  await db.execute(
    `INSERT INTO creator_requests (id, user_id, login_id, name, artist_name, message, status)
     VALUES (?,?,?,?,?,?,'pending')`,
    [reqId, userId, loginId || null, name || null, artistName || null, message || null]
  );
  return findById(reqId);
}

async function getAllRequests() {
  const [rows] = await db.execute(
    `SELECT * FROM creator_requests ORDER BY created_at DESC`
  );
  return rows.map(rowToRequest);
}

async function findById(id) {
  const [rows] = await db.execute(`SELECT * FROM creator_requests WHERE id = ?`, [id]);
  return rows.length ? rowToRequest(rows[0]) : null;
}

async function updateRequest(id, updates) {
  const colMap = {
    status: 'status', reviewedAt: 'reviewed_at', reviewedBy: 'reviewed_by',
  };
  const setClauses = [], values = [];
  for (const [jsKey, col] of Object.entries(colMap)) {
    if (updates[jsKey] !== undefined) { setClauses.push(`${col} = ?`); values.push(updates[jsKey]); }
  }
  if (!setClauses.length) return findById(id);
  values.push(id);
  await db.execute(`UPDATE creator_requests SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

module.exports = { findPendingByUserId, getLatestByUserId, createRequest, getAllRequests, findById, updateRequest };
```

---

### 6-3-9. trackDeleteRequestStore.js (DB 버전)

```js
// backend/lib/trackDeleteRequestStore.js
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

function rowToReq(row) {
  return {
    id: row.id,
    trackId: row.track_id,
    creatorUserId: row.creator_user_id,
    creatorLoginId: row.creator_login_id,
    artistName: row.artist_name,
    trackTitle: row.track_title,
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAll(status) {
  let sql = `SELECT * FROM track_delete_requests`;
  const params = [];
  if (status) { sql += ` WHERE status = ?`; params.push(status); }
  sql += ` ORDER BY created_at DESC`;
  const [rows] = await db.execute(sql, params);
  return rows.map(rowToReq);
}

async function findPendingByTrackId(trackId) {
  const [rows] = await db.execute(
    `SELECT * FROM track_delete_requests WHERE track_id = ? AND status = 'pending'`, [trackId]
  );
  return rows.length ? rowToReq(rows[0]) : null;
}

async function getByCreatorUserId(userId) {
  const [rows] = await db.execute(
    `SELECT * FROM track_delete_requests WHERE creator_user_id = ? ORDER BY created_at DESC`, [userId]
  );
  return rows.map(rowToReq);
}

async function create({ trackId, creatorUserId, creatorLoginId, artistName, trackTitle, reason }) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO track_delete_requests
       (id, track_id, creator_user_id, creator_login_id, artist_name, track_title, reason, status)
     VALUES (?,?,?,?,?,?,?,'pending')`,
    [id, trackId, creatorUserId, creatorLoginId || null, artistName || '', trackTitle, reason || '']
  );
  return findById(id);
}

async function findById(id) {
  const [rows] = await db.execute(`SELECT * FROM track_delete_requests WHERE id = ?`, [id]);
  return rows.length ? rowToReq(rows[0]) : null;
}

async function update(id, fields) {
  const colMap = {
    status: 'status', reviewedBy: 'reviewed_by',
    reviewedAt: 'reviewed_at', rejectReason: 'reject_reason',
  };
  const setClauses = [], values = [];
  for (const [jsKey, col] of Object.entries(colMap)) {
    if (fields[jsKey] !== undefined) { setClauses.push(`${col} = ?`); values.push(fields[jsKey]); }
  }
  if (!setClauses.length) return findById(id);
  values.push(id);
  await db.execute(`UPDATE track_delete_requests SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function removeByTrackId(trackId) {
  await db.execute(`DELETE FROM track_delete_requests WHERE track_id = ?`, [trackId]);
}

module.exports = { getAll, findPendingByTrackId, getByCreatorUserId, create, findById, update, removeByTrackId };
```

---

### 6-3-10. hardDeleteLogStore.js (DB 버전)

```js
// backend/lib/hardDeleteLogStore.js
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function addLog({ trackId, title, artist, deletedBy, reason }) {
  const id = uuidv4();
  await db.execute(
    `INSERT INTO hard_delete_logs (id, track_id, title, artist, deleted_by, reason, deleted_at)
     VALUES (?,?,?,?,?,?,NOW())`,
    [id, trackId || null, title || '', artist || '', deletedBy, reason || 'hard delete by admin']
  );
  const [rows] = await db.execute(`SELECT * FROM hard_delete_logs WHERE id = ?`, [id]);
  return rows[0];
}

async function getAll() {
  const [rows] = await db.execute(
    `SELECT * FROM hard_delete_logs ORDER BY deleted_at DESC`
  );
  return rows;
}

module.exports = { addLog, getAll };
```

---

### 6-3-11. siteSettingsStore.js (DB 버전)

```js
// backend/lib/siteSettingsStore.js
const db = require('./db');

async function getSettings() {
  const [rows] = await db.execute(`SELECT * FROM site_settings WHERE id = 1`);
  return rows.length ? rows[0] : null;
}

async function updateSettings(updates) {
  const colMap = {
    siteName: 'site_name', logoUrl: 'logo_url',
    heroBackgroundUrl: 'hero_background_url',
    mainColor: 'main_color', subColor1: 'sub_color1',
    subColor2: 'sub_color2', subColor3: 'sub_color3',
  };
  const setClauses = [], values = [];
  for (const [jsKey, col] of Object.entries(colMap)) {
    if (updates[jsKey] !== undefined) { setClauses.push(`${col} = ?`); values.push(updates[jsKey]); }
  }
  if (!setClauses.length) return getSettings();
  await db.execute(`UPDATE site_settings SET ${setClauses.join(', ')} WHERE id = 1`, values);
  return getSettings();
}

module.exports = { getSettings, updateSettings };
```

---

### 6-3-12. likes 카운트 초기 동기화 (데이터 마이그레이션 시 1회 실행)

JSON 데이터를 MySQL로 이전한 직후 `tracks.likes` 값을 `liked_tracks` 테이블 기준으로 맞춥니다.

```sql
UPDATE tracks t
SET likes = (SELECT COUNT(*) FROM liked_tracks WHERE track_id = t.id);
```

### 6-4. routes에서 async/await 추가

store 함수들이 async로 바뀌므로 routes에서 `await` 추가가 필요합니다.

```js
// 변경 전 (routes/tracks.js)
router.get('/', (req, res) => {
  const tracks = store.getAllTracks();
  res.json(tracks);
});

// 변경 후
router.get('/', async (req, res) => {
  try {
    const tracks = await store.getAllTracks();
    res.json(tracks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});
```

### 6-5. admin.js의 로컬 파일 삭제 코드 제거

`backend/routes/admin.js`의 `hardDeleteTrackCompletely` 함수에서  
로컬 파일 삭제(`safeUnlink`) 부분을 S3 삭제(`deleteFromS3`)로 교체합니다.

```js
// 변경 전
safeUnlink(path.join(AUDIO_DIR, track.audioKey));

// 변경 후
const { deleteFromS3 } = require('../lib/s3');
if (track.audioKey) await deleteFromS3(track.audioKey);
if (track.coverKey) await deleteFromS3(track.coverKey);
```

### 6-6. siteSettings URL 수정

`backend/routes/admin.js`에서 로고/배경 업로드 후 URL 생성 부분을 S3 URL로 교체합니다.

```js
// 변경 전
const logoUrl = `http://localhost:${process.env.PORT || 5000}/uploads/site/${req.file.filename}`;

// 변경 후
const { getFileUrl } = require('../lib/s3');
const logoUrl = getFileUrl(req.file.key);
```

---

## 7. EC2 인스턴스 설정

### 7-1. EC2 인스턴스 생성

```
AWS 콘솔 → EC2 → 인스턴스 시작
- AMI: Amazon Linux 2023
- 인스턴스 유형: t3.small (권장) or t3.micro (트래픽 적을 때)
- 키 페어: 새로 생성 후 .pem 파일 안전하게 보관
- 보안 그룹:
    인바운드 - SSH(22): 내 IP만
    인바운드 - HTTP(80): 0.0.0.0/0
    인바운드 - HTTPS(443): 0.0.0.0/0
    인바운드 - 5000: 0.0.0.0/0 (Nginx 설정 전 임시)
- 스토리지: 20GB gp3
```

### 7-2. EC2 초기 설정

```bash
# EC2 접속
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Node.js 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Git 설치
sudo yum install -y git

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2

# Nginx 설치
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 7-3. 코드 배포

```bash
# EC2에서
git clone https://github.com/your-repo/whatpl.git
cd whatpl/backend
npm install --production

# .env 파일 생성
nano .env
```

### 7-4. .env 파일 내용 (EC2)

```env
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=your-very-strong-random-secret-key-here

# AWS S3
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=whatpl-media
CLOUDFRONT_DOMAIN=           # CloudFront 도메인 (선택, d1234.cloudfront.net 형식)

# RDS MySQL
DB_HOST=whatpl-db.xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASS=your-rds-password
DB_NAME=whatpl

# 프론트엔드 URL (CORS 허용)
FRONTEND_URL=https://your-domain.com
```

### 7-5. PM2로 서버 실행

```bash
cd ~/whatpl/backend

# 서버 시작
pm2 start server.js --name whatpl-backend

# EC2 재시작 시 자동 실행 등록
pm2 startup
pm2 save

# 로그 확인
pm2 logs whatpl-backend
```

### 7-6. Nginx 리버스 프록시 설정

```bash
sudo nano /etc/nginx/conf.d/whatpl.conf
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 프론트엔드 (S3 정적 호스팅 사용 시 불필요)
    # location / {
    #     root /home/ec2-user/whatpl/frontend/dist;
    #     try_files $uri /index.html;
    # }

    # 백엔드 API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 헬스체크
    location /health {
        proxy_pass http://localhost:5000;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7-7. HTTPS 설정 (Let's Encrypt)

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 자동 갱신 확인
sudo certbot renew --dry-run
```

---

## 8. 프론트엔드 배포

### 8-1. API URL 환경변수 설정

```bash
# frontend/.env.production 파일 생성
VITE_API_BASE_URL=https://your-domain.com
```

프론트엔드의 axios 기본 URL을 환경변수로 설정합니다:

```js
// frontend/src/api/index.js (또는 axios 설정 파일)
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});
```

### 8-2. 빌드

```bash
cd frontend
npm install
npm run build
# dist/ 폴더에 빌드 결과물 생성
```

### 옵션 A. S3 정적 호스팅 (권장)

```bash
# S3 버킷 생성 (whatpl-frontend)
aws s3 mb s3://whatpl-frontend --region ap-northeast-2

# 정적 웹사이트 호스팅 활성화
aws s3 website s3://whatpl-frontend \
  --index-document index.html \
  --error-document index.html

# 빌드 결과물 업로드
aws s3 sync frontend/dist s3://whatpl-frontend --acl public-read

# 버킷 정책 (퍼블릭 읽기)
aws s3api put-bucket-policy --bucket whatpl-frontend --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::whatpl-frontend/*"
  }]
}'
```

접속 URL: `http://whatpl-frontend.s3-website.ap-northeast-2.amazonaws.com`

### 옵션 B. AWS Amplify (더 간편, 자동 배포)

```
AWS 콘솔 → Amplify → 호스팅 → 새 앱 → GitHub 연결
- 브랜치: main
- 빌드 설정:
    appRoot: frontend
    build command: npm run build
    output directory: dist
- 환경변수: VITE_API_BASE_URL=https://your-domain.com
```

GitHub push 시 자동 배포됩니다.

---

## 9. CloudFront 설정 (선택)

S3의 오디오/이미지 파일을 CDN으로 서빙하면 전 세계 빠른 스트리밍이 가능합니다.

### 9-1. 배포 생성

```
AWS 콘솔 → CloudFront → 배포 생성
- 원본 도메인: whatpl-media.s3.ap-northeast-2.amazonaws.com
- S3 버킷 액세스: OAC(Origin Access Control) 사용 권장
- 기본 캐시 동작:
    - 뷰어 프로토콜 정책: Redirect HTTP to HTTPS
    - 허용된 HTTP 메서드: GET, HEAD
    - 캐시 정책: CachingOptimized
- 가격 범주: 가격 범주 100 (미국, 유럽, 아시아)
```

### 9-2. 배포 도메인 확인

생성 완료 후 도메인 확인: `d1234abcd.cloudfront.net`

`.env`의 `CLOUDFRONT_DOMAIN`에 설정:

```env
CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net
```

이렇게 하면 파일 URL이 자동으로 CloudFront URL로 생성됩니다.

---

## 10. 환경변수 정리

### 백엔드 (`backend/.env`)

| 변수 | 예시 값 | 설명 |
|------|---------|------|
| `PORT` | `5000` | 서버 포트 |
| `NODE_ENV` | `production` | 환경 |
| `JWT_SECRET` | `랜덤 64자 이상` | JWT 서명키 |
| `AWS_REGION` | `ap-northeast-2` | AWS 리전 |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | IAM Access Key |
| `AWS_SECRET_ACCESS_KEY` | `...` | IAM Secret Key |
| `S3_BUCKET_NAME` | `whatpl-media` | S3 버킷명 |
| `CLOUDFRONT_DOMAIN` | `d1234.cloudfront.net` | CloudFront (선택) |
| `DB_HOST` | `whatpl-db.xxx.rds.amazonaws.com` | RDS 엔드포인트 |
| `DB_PORT` | `3306` | MySQL 포트 |
| `DB_USER` | `admin` | DB 사용자 |
| `DB_PASS` | `강력한 비밀번호` | DB 비밀번호 |
| `DB_NAME` | `whatpl` | 데이터베이스명 |
| `FRONTEND_URL` | `https://your-domain.com` | CORS 허용 도메인 |

### 프론트엔드 (`frontend/.env.production`)

| 변수 | 예시 값 | 설명 |
|------|---------|------|
| `VITE_API_BASE_URL` | `https://your-domain.com` | 백엔드 API URL |

---

## 11. 보안 체크리스트

### 필수 확인 항목

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `JWT_SECRET`을 64자 이상 랜덤 문자열로 설정
- [ ] RDS 퍼블릭 액세스 비활성화 (배포 완료 후)
- [ ] EC2 보안 그룹 SSH(22) 포트를 내 IP로만 제한
- [ ] IAM 사용자에 최소 권한만 부여 (S3FullAccess만, 나머지 제거)
- [ ] HTTPS 인증서 설치 완료
- [ ] S3 버킷에 민감한 파일(`.env` 등) 업로드 안 됨 확인

### admin 계정 보안

- [ ] admin 비밀번호를 강력한 것으로 변경 (서비스 오픈 전)
- [ ] admin 계정은 업로드 불가 — 백엔드/프론트 모두 차단 확인됨
- [ ] 관리자 재인증(reauth) 15분 만료 정상 동작 확인

---

## 12. 배포 후 테스트

### 기능 테스트

```
1. admin_hyunsu, admin_juyeon, admin_inho, admin_wonjun 로그인
2. 관리자 콘솔(/admin) 접근
3. /upload 접근 → "관리자 계정은 업로드 불가" 메시지 표시
4. 네비바에 + 업로드 버튼 미노출 (admin 기준)
5. 신규 일반 회원가입 → Creator 신청 → 관리자 승인 → 음원 업로드
6. 업로드한 음원이 S3 URL로 정상 재생
7. 홈/탐색 페이지에 음원 표시
8. 관리자 콘솔에서 음원 삭제 → S3 파일도 삭제됨 확인
9. 서버 모니터링 (/admin → 서버 상태) 정상 표시
```

### 헬스체크

```bash
# 백엔드 헬스체크
curl https://your-domain.com/health
# 응답: {"status":"ok"}

# DB 연결 확인 (admin 로그인 시도로 간접 확인)
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"admin_hyunsu","password":"your-password"}'
```

---

## 작업 순서 요약

```
Phase 1 — AWS 인프라 구축
  1. IAM 사용자 생성 + 키 발급
  2. S3 버킷 생성 + 정책/CORS 설정
  3. RDS MySQL 생성
  4. EC2 인스턴스 생성

Phase 2 — DB 스키마 + 초기 데이터
  5. RDS에 SQL 스키마 실행 (5장)
  6. admin 4명 INSERT
  7. site/ 이미지 S3에 업로드

Phase 3 — 백엔드 코드 수정
  8. lib/s3.js 실제 S3 연동으로 교체
  9. lib/db.js 생성 (mysql2)
  10. lib/store.js 등 모든 store → DB 쿼리로 교체
  11. routes에 async/await 추가

Phase 4 — 배포
  12. EC2에 코드 배포 + .env 설정
  13. PM2로 백엔드 실행
  14. Nginx + HTTPS 설정
  15. 프론트엔드 빌드 → S3 or Amplify 배포

Phase 5 — 검증
  16. 헬스체크 + 기능 테스트
  17. admin 로그인 4개 모두 확인
  18. 음원 업로드/재생/삭제 전체 플로우 확인
```
