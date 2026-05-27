# WHATPL — 음악 스트리밍 서비스

SoundCloud 스타일의 음악 스트리밍 플랫폼.  
Node.js + Express (백엔드) / React + Vite (프론트엔드) / AWS S3 (파일 저장) / AWS RDS MySQL (데이터베이스)

---

## 프로젝트 구조

```
202605271803/
├── backend/
│   ├── server.js               # Express 앱 진입점
│   ├── routes/
│   │   ├── auth.js             # 로그인, 회원가입, 내 정보
│   │   ├── tracks.js           # 음원 CRUD, 재생수, 트렌딩
│   │   ├── myTracks.js         # 크리에이터 내 음원 관리
│   │   ├── playlists.js        # 재생목록 CRUD
│   │   ├── likedTracks.js      # 좋아요
│   │   ├── followedArtists.js  # 아티스트 팔로우
│   │   ├── creatorRequests.js  # 크리에이터 신청
│   │   ├── creators.js         # 크리에이터 목록/상세
│   │   ├── recentlyPlayed.js   # 최근 재생 기록
│   │   ├── playerSessions.js   # 플레이어 세션 유지
│   │   ├── notifications.js    # 알림
│   │   ├── search.js           # 통합 검색
│   │   ├── siteSettings.js     # 사이트 설정 조회
│   │   └── admin.js            # 관리자 콘솔 API
│   ├── lib/
│   │   ├── s3.js               # 파일 업로드 (로컬/S3 전환 지점)
│   │   ├── store.js            # 트랙 저장소
│   │   ├── userStore.js        # 사용자 저장소
│   │   ├── playlistStore.js    # 재생목록 저장소
│   │   ├── likedTrackStore.js  # 좋아요 저장소
│   │   ├── followedArtistStore.js
│   │   ├── notificationStore.js
│   │   ├── recentlyPlayedStore.js
│   │   ├── playerSessionStore.js
│   │   ├── creatorRequestStore.js
│   │   ├── trackDeleteRequestStore.js
│   │   ├── hardDeleteLogStore.js
│   │   ├── siteSettingsStore.js
│   │   └── serverStats.js      # 서버 모니터링 통계
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT 인증, 관리자 재인증
│   │   └── statsMiddleware.js  # 요청 통계 수집
│   └── data/                   # JSON 파일 DB (AWS 전환 전 로컬용)
│       ├── users.json
│       ├── tracks.json
│       └── ...
└── frontend/
    └── src/
        ├── api/                # axios API 함수 모음
        ├── components/         # Navbar, PlayerBar, TrackCard 등
        ├── context/            # AuthContext (로그인 상태 전역 관리)
        ├── hooks/              # usePlayer (오디오 플레이어 전역 상태)
        └── pages/              # Home, Explore, Upload, Admin 등
```

---

## 회원 역할 (Role)

| 역할 | 설명 |
|------|------|
| `user` | 일반 회원. 음악 감상, 좋아요, 플레이리스트, 팔로우 가능. Creator 신청 가능. |
| `creator` | 크리에이터 회원. 음원 업로드 가능. 관리자 승인 후 부여. |
| `admin` | 관리자. 음원/회원 관리, 사이트 설정 변경. 음원 업로드 불가. |

---

## 실행 방법

### 1. 의존성 설치

```bash
# 루트에서 한 번에
npm run install:all

# 또는 각각
cd backend && npm install
cd ../frontend && npm install
```

### 2. 환경변수 설정

```bash
cd backend
cp .env.example .env
# .env 파일을 열어 필요한 값 입력
```

**`backend/.env` 필수 항목:**

```env
PORT=5000
JWT_SECRET=your-secret-key

# 파일 저장 (로컬 테스트용 — AWS 배포 시 S3 키 입력)
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=

# AWS RDS 연결 (배포 시)
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASS=
DB_NAME=whatpl

FRONTEND_URL=http://localhost:5173
```

### 3. 서버 실행

```bash
# 터미널 1 — 백엔드
npm run dev:backend    # http://localhost:5000

# 터미널 2 — 프론트엔드
npm run dev:frontend   # http://localhost:5173
```

---

## API 엔드포인트

### 인증 (`/api/auth`)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/auth/me | 내 정보 조회 |
| PATCH | /api/auth/me | 내 정보 수정 |
| POST | /api/auth/me/profile-image | 프로필 이미지 업로드 |
| DELETE | /api/auth/me | 회원 탈퇴 |

### 음원 (`/api/tracks`)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/tracks | 음원 목록 (genre, search 쿼리 지원) |
| GET | /api/tracks/trending | 최근 인기 음원 |
| GET | /api/tracks/top-liked | 좋아요 많은 음원 |
| GET | /api/tracks/:id | 단일 음원 조회 |
| POST | /api/tracks | 음원 업로드 (creator 전용) |
| PATCH | /api/tracks/:id | 음원 정보 수정 |
| POST | /api/tracks/:id/play | 재생수 증가 |
| DELETE | /api/tracks/:id | 음원 삭제 (admin 전용) |

### 재생목록 (`/api/playlists`)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/playlists | 내 재생목록 목록 |
| POST | /api/playlists | 재생목록 생성 |
| GET | /api/playlists/:id | 재생목록 상세 |
| PATCH | /api/playlists/:id | 이름 변경 |
| DELETE | /api/playlists/:id | 재생목록 삭제 |
| POST | /api/playlists/:id/tracks | 트랙 추가 |
| DELETE | /api/playlists/:id/tracks/:index | 트랙 제거 |

### 크리에이터 신청 (`/api/creator-requests`)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/creator-requests | Creator 신청 |
| GET | /api/creator-requests/mine | 내 신청 상태 조회 |

### 좋아요 (`/api/likes`)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/likes | 내 좋아요 목록 |
| POST | /api/likes/:trackId | 좋아요 추가 |
| DELETE | /api/likes/:trackId | 좋아요 취소 |

### 팔로우 (`/api/followed-artists`)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/followed-artists | 팔로우 중인 아티스트 |
| POST | /api/followed-artists | 팔로우 |
| DELETE | /api/followed-artists/:artistName | 언팔로우 |

### 알림 (`/api/notifications`)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/notifications | 알림 목록 |
| GET | /api/notifications/unread-count | 미읽 알림 수 |
| PATCH | /api/notifications/:id/read | 읽음 처리 |
| PATCH | /api/notifications/read-all | 전체 읽음 |

### 관리자 (`/api/admin`) — admin 전용

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/admin/reauth | 관리자 2차 인증 |
| GET | /api/admin/tracks | 전체 음원 조회 (삭제 포함) |
| PATCH | /api/admin/tracks/:id | 음원 정보 수정 |
| DELETE | /api/admin/tracks/:id | 음원 소프트 삭제 |
| DELETE | /api/admin/tracks/:id/hard | 음원 영구 삭제 (재인증 필요) |
| GET | /api/admin/users | 회원 목록 |
| PATCH | /api/admin/users/:id/deactivate | 회원 비활성화 |
| PATCH | /api/admin/users/:id/activate | 회원 활성화 |
| GET | /api/admin/track-delete-requests | 삭제 요청 목록 |
| PATCH | /api/admin/track-delete-requests/:id/approve | 삭제 요청 승인 |
| PATCH | /api/admin/track-delete-requests/:id/reject | 삭제 요청 반려 |
| GET | /api/admin/hard-delete-logs | 영구 삭제 로그 |
| PATCH | /api/admin/site-settings | 사이트 색상 설정 |
| POST | /api/admin/site-settings/logo | 로고 이미지 업로드 |
| POST | /api/admin/site-settings/hero-background | 히어로 배경 업로드 |
| GET | /api/admin/server-monitoring | 서버 모니터링 정보 |

---

## AWS 배포

AWS 배포 전체 가이드는 [AWS_MIGRATION_GUIDE.md](./AWS_MIGRATION_GUIDE.md)를 참고하세요.

**배포 구성 요약:**

```
프론트엔드  →  S3 정적 호스팅 or AWS Amplify
백엔드     →  EC2 (Node.js + PM2 + Nginx)
데이터베이스 →  RDS MySQL 8.0
파일 저장  →  S3 (오디오, 이미지)
CDN       →  CloudFront (선택)
```

---

## 관리자 계정

초기 운영 시작 시 admin 계정 4개가 등록되어 있습니다.  
비밀번호는 배포 전 반드시 변경하세요.

| loginId | 이름 |
|---------|------|
| admin_hyunsu | 조현수 |
| admin_juyeon | 박주연 |
| admin_inho | 최인호 |
| admin_wonjun | 최원준 |

> admin 계정은 음원 업로드가 불가합니다. 관리자 콘솔(`/admin`)만 사용 가능합니다.
