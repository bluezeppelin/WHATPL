# WHATPL — 음악 스트리밍 서비스

AWS 서울(ap-northeast-2)·상파울루(sa-east-1) 멀티 리전 환경에 배포한 음원 스트리밍 웹 서비스입니다. (Team awsome, 4인 팀 프로젝트)

- **Frontend**: React 18 + Vite, react-router-dom, axios, i18next(ko/en/ja)
- **Backend**: Node.js + Express, JWT 인증, multer-s3
- **Database**: MySQL 8.0 (AWS RDS, 14개 테이블)
- **Storage**: AWS S3 + CloudFront (음원·커버·프로필·사이트 이미지)
- **Server**: EC2(Amazon Linux 2023) + nginx + PM2

---

## 주요 기능

- **회원**: 회원가입·로그인(JWT), 아이디 찾기, 비밀번호 재설정·변경, 프로필 이미지, 회원 탈퇴
- **음원**: 업로드(Creator 전용), 재생, 재생수 집계, 트렌딩·좋아요 순위, 장르 필터
- **검색**: 트랙·크리에이터 통합 검색
- **플레이리스트**: 생성·수정·삭제, 트랙 추가·제거·순서 동기화
- **소셜**: 좋아요, 아티스트 팔로우, 새 음원 업로드 알림
- **크리에이터**: Creator 신청 → 관리자 승인, 내 음원 관리, 삭제 요청
- **관리자 콘솔**: 음원 소프트 삭제·영구 삭제(15분 재인증 필요), 회원 활성/비활성, 삭제 요청 처리, 사이트 색상·로고·배경 설정, 서버 모니터링
- **기타**: 다국어(한국어·영어·일본어), 최근 재생 기록, 플레이어 세션 유지

---

## 회원 역할 (Role)

| 역할 | 설명 |
|------|------|
| `user` | 일반 회원. 음악 감상, 좋아요, 플레이리스트, 팔로우 가능. Creator 신청 가능. |
| `creator` | 크리에이터 회원. 음원 업로드 가능. 관리자 승인 후 부여. |
| `admin` | 관리자. 음원/회원 관리, 사이트 설정 변경. 음원 업로드 및 회원 탈퇴 불가. |

---

## 프로젝트 구조

```
WHATPL/
├── backend/
│   ├── server.js               # Express 앱 진입점
│   ├── schema.sql              # MySQL 테이블 생성 스크립트 (14개 테이블)
│   ├── migrations/
│   │   └── 001_sql_transition_fixes.sql  # 기존 DB 보정용
│   ├── scripts/
│   │   └── seedAdmins.js       # 관리자 초기 계정 생성
│   ├── routes/
│   │   ├── auth.js             # 회원가입, 로그인, 내 정보, 아이디/비밀번호 찾기
│   │   ├── tracks.js           # 음원 조회·업로드·수정, 재생수, 트렌딩
│   │   ├── myTracks.js         # 크리에이터 내 음원 관리, 삭제 요청
│   │   ├── playlists.js        # 재생목록 CRUD
│   │   ├── likedTracks.js      # 좋아요
│   │   ├── followedArtists.js  # 아티스트 팔로우
│   │   ├── creatorRequests.js  # 크리에이터 신청·승인
│   │   ├── creators.js         # 크리에이터 목록/상세
│   │   ├── recentlyPlayed.js   # 최근 재생 기록
│   │   ├── playerSessions.js   # 플레이어 세션 유지
│   │   ├── notifications.js    # 알림
│   │   ├── search.js           # 통합 검색
│   │   ├── siteSettings.js     # 사이트 설정 조회
│   │   ├── imageProxy.js       # 커버 색 추출용 이미지 프록시
│   │   └── admin.js            # 관리자 콘솔 API
│   ├── lib/
│   │   ├── db.js               # MySQL 커넥션 풀 (mysql2)
│   │   ├── s3.js               # S3 업로드·삭제, 파일 URL 생성
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
│   │   ├── trackReferenceCleanup.js  # 트랙 삭제 시 참조 정리
│   │   ├── userDeleteService.js      # 회원 탈퇴 처리
│   │   └── serverStats.js      # 서버 모니터링 통계
│   └── middleware/
│       ├── authMiddleware.js   # JWT 인증, 관리자 재인증
│       └── statsMiddleware.js  # 요청 통계 수집
└── frontend/
    └── src/
        ├── api/                # API 호출 함수 모음
        ├── components/         # Navbar, PlayerBar, TrackCard 등
        ├── constants/          # 장르 목록
        ├── context/            # AuthContext (로그인 상태 전역 관리)
        ├── hooks/              # usePlayer (오디오 플레이어 전역 상태) 등
        ├── locales/            # 다국어 리소스 (ko/en/ja)
        ├── pages/              # Home, Explore, Upload, Admin 등
        └── utils/              # 커버 색 추출, 테마
```

---

## 로컬 실행 방법

> 데이터는 MySQL, 파일은 S3에 저장합니다. 로컬에서 실행하려면 MySQL DB와 S3 버킷이 필요합니다.

### 1. 의존성 설치

```bash
# 루트에서 한 번에
npm run install:all

# 또는 각각
cd backend && npm install
cd ../frontend && npm install
```

### 2. DB 준비

MySQL에 `backend/schema.sql`을 실행해 테이블을 생성합니다.

### 3. 환경변수 설정

```bash
cd backend
cp .env.example .env
# .env 파일을 열어 필요한 값 입력
```

| 변수 | 설명 |
|------|------|
| `PORT` | 백엔드 포트 (기본 `5000`) |
| `JWT_SECRET` | JWT 서명 키 (**필수**, 없으면 서버가 시작되지 않음) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASS` / `DB_NAME` | MySQL 연결 정보 |
| `AWS_REGION` / `S3_BUCKET_NAME` | S3 버킷 정보 |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | 로컬 개발용. EC2에서는 비워두고 IAM 역할 사용 |
| `CLOUDFRONT_DOMAIN` | (선택) 설정 시 파일 URL을 CloudFront 주소로 생성 |
| `FRONTEND_URL` | CORS 허용 주소. 쉼표로 여러 개 지정 가능 (기본 `http://localhost:5173`) |
| `ADMIN_INITIAL_PASSWORD` | 관리자 초기 계정 생성용 비밀번호 |

### 4. 서버 실행

```bash
# 터미널 1 — 백엔드
npm run dev:backend    # http://localhost:5000

# 터미널 2 — 프론트엔드
npm run dev:frontend   # http://localhost:5173
```

프론트 개발 서버는 `/api` 요청을 `http://localhost:5000`으로 프록시합니다(`vite.config.js`).

---

## API 엔드포인트

🔒 로그인 필요 · 👑 admin 전용 · 🎵 creator 전용

### 인증 (`/api/auth`)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/auth/check-id | 아이디 중복 확인 |
| GET | /api/auth/check-artist-name | 아티스트명 중복 확인 |
| POST | /api/auth/signup | 회원가입 |
| POST | /api/auth/login | 로그인 (JWT 발급, 7일) |
| POST | /api/auth/find-id | 아이디 찾기 |
| POST | /api/auth/reset-password | 비밀번호 재설정 |
| GET | /api/auth/me | 내 정보 조회 🔒 |
| PATCH | /api/auth/me | 내 정보 수정 🔒 |
| POST | /api/auth/me/profile-image | 프로필 이미지 업로드 🔒 |
| PATCH | /api/auth/change-password | 비밀번호 변경 🔒 |
| DELETE | /api/auth/me | 회원 탈퇴 🔒 (admin 불가) |

### 음원 (`/api/tracks`)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/tracks | 음원 목록 (`genre`, `search` 쿼리 지원) |
| GET | /api/tracks/trending | 최근 인기 음원 (`range`, `limit`) |
| GET | /api/tracks/top-liked | 좋아요 많은 음원 |
| GET | /api/tracks/:id | 단일 음원 조회 |
| POST | /api/tracks | 음원 업로드 🎵 |
| PATCH | /api/tracks/:id | 음원 정보 수정 🔒 (본인 음원 또는 admin) |
| POST | /api/tracks/:id/play | 재생수 증가 🔒 |
| DELETE | /api/tracks/:id | 음원 소프트 삭제 👑 |

### 내 음원 (`/api/my`) 🎵

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/my/tracks | 내 음원 목록 |
| PATCH | /api/my/tracks/:trackId | 내 음원 정보 수정 |
| POST | /api/my/tracks/:trackId/delete-request | 삭제 요청 |
| GET | /api/my/track-delete-requests | 내 삭제 요청 목록 |

### 재생목록 (`/api/playlists`) 🔒

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/playlists | 내 재생목록 목록 |
| POST | /api/playlists | 재생목록 생성 |
| GET | /api/playlists/:id | 재생목록 상세 |
| PATCH | /api/playlists/:id | 이름 변경 |
| DELETE | /api/playlists/:id | 재생목록 삭제 |
| POST | /api/playlists/:id/tracks | 트랙 추가 |
| PUT | /api/playlists/:id/tracks | 트랙 목록 전체 교체 (대기열 동기화) |
| DELETE | /api/playlists/:id/tracks/by-id/:trackId | 트랙 제거 (ID 기준) |
| DELETE | /api/playlists/:id/tracks/at/:index | 트랙 제거 (위치 기준) |

### 크리에이터 신청 (`/api/creator-requests`) 🔒

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/creator-requests | Creator 신청 |
| GET | /api/creator-requests/me | 내 신청 상태 조회 |
| GET | /api/creator-requests | 전체 신청 목록 👑 |
| PATCH | /api/creator-requests/:id/approve | 신청 승인 👑 |
| PATCH | /api/creator-requests/:id/reject | 신청 반려 👑 |

### 크리에이터 (`/api/creators`)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/creators | 크리에이터 목록 |
| GET | /api/creators/:creatorId | 크리에이터 상세 |

### 좋아요 (`/api/likes`) 🔒

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/likes/me | 내 좋아요 목록 |
| GET | /api/likes/:trackId | 좋아요 여부 조회 |
| POST | /api/likes/:trackId | 좋아요 추가 |
| DELETE | /api/likes/:trackId | 좋아요 취소 |

### 팔로우 (`/api/followed-artists`) 🔒

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/followed-artists/me | 팔로우 중인 아티스트 |
| GET | /api/followed-artists/my-followers | 나를 팔로우하는 사용자 (creator용) |
| GET | /api/followed-artists/:artistName | 팔로우 여부 조회 |
| POST | /api/followed-artists/:artistName | 팔로우 |
| DELETE | /api/followed-artists/:artistName | 언팔로우 |

### 알림 (`/api/notifications`) 🔒

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/notifications | 알림 목록 |
| GET | /api/notifications/unread-count | 읽지 않은 알림 수 |
| PATCH | /api/notifications/read-all | 전체 읽음 |
| PATCH | /api/notifications/:id/read | 읽음 처리 |
| DELETE | /api/notifications/:id | 알림 삭제 |

### 기타

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/search?q= | 트랙·크리에이터 통합 검색 |
| GET | /api/site-settings | 사이트 설정 조회 |
| GET | /api/recently-played/me | 최근 재생 기록 🔒 |
| POST | /api/recently-played/:trackId | 최근 재생 기록 추가 🔒 |
| GET | /api/player-session/me | 플레이어 세션 조회 🔒 |
| PUT | /api/player-session | 플레이어 세션 저장 🔒 |
| GET | /api/image-proxy?url= | 커버 색 추출용 이미지 프록시 (자체 버킷 객체만 허용) |
| GET | /health | 헬스 체크 (ALB 대상 그룹용) |

### 관리자 (`/api/admin`) 👑

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/admin/reauth | 관리자 재인증 (15분 유효 토큰 발급) |
| GET | /api/admin/tracks | 전체 음원 조회 (삭제 포함) |
| PATCH | /api/admin/tracks/:trackId | 음원 정보 수정 |
| DELETE | /api/admin/tracks/:trackId | 음원 소프트 삭제 |
| DELETE | /api/admin/tracks/:id/hard | 음원 영구 삭제 (재인증 필요, 소프트 삭제된 음원만) |
| GET | /api/admin/hard-delete-logs | 영구 삭제 로그 |
| GET | /api/admin/track-delete-requests | 삭제 요청 목록 |
| PATCH | /api/admin/track-delete-requests/:id/approve | 삭제 요청 승인 |
| PATCH | /api/admin/track-delete-requests/:id/reject | 삭제 요청 반려 |
| GET | /api/admin/users | 회원 목록 |
| PATCH | /api/admin/users/:userId/deactivate | 회원 비활성화 |
| PATCH | /api/admin/users/:userId/activate | 회원 활성화 |
| PATCH | /api/admin/site-settings | 사이트 색상 설정 |
| POST | /api/admin/site-settings/logo | 로고 이미지 업로드 |
| POST | /api/admin/site-settings/hero-background | 히어로 배경 업로드 |
| GET | /api/admin/server-monitoring | 서버 모니터링 정보 |

---

## AWS 배포 구성

![AWS 아키텍처 구성도](docs/architecture.png)

| 영역 | 구성 |
|------|------|
| 리전 | 서울(ap-northeast-2), 상파울루(sa-east-1) |
| 글로벌 진입 | Route 53, Global Accelerator, ACM |
| 네트워크 | VPC, Public/Private Subnet, IGW, NAT Gateway, VPC Peering, OpenVPN |
| 컴퓨팅 | ALB, Auto Scaling Group, Launch Template(UserData) |
| 데이터베이스 | RDS for MySQL 8.0 Multi-AZ (서울). 상파울루는 VPC Peering으로 서울 RDS에 연결 |
| 스토리지·전송 | S3 + CloudFront |
| 보안 | WAF, Security Group, IAM 역할, SSM Parameter Store |
| IaC | CloudFormation StackSets |

### EC2 서버 구성 (Launch Template UserData)

1. 패키지 설치: git, nginx, Node.js 20(NodeSource), PM2
2. SSM Parameter Store에서 DB 비밀번호 조회 후 `backend/.env` 생성 (S3 접근은 EC2 IAM 역할 사용)
3. 백엔드 의존성 설치 후 PM2로 실행 (`127.0.0.1:5000`), 재부팅 시 자동 시작 등록
4. 프론트엔드 빌드 (`VITE_API_BASE_URL`은 비워서 같은 도메인의 `/api`로 요청)
5. nginx 설정
   - `frontend/dist` 정적 파일 제공
   - `/api/`, `/health` → `127.0.0.1:5000` 프록시
   - 없는 경로는 `index.html` 반환 (새로고침 404 방지)
   - `client_max_body_size 55M` (음원 50MB 업로드 허용)

---

## DB 초기화 및 관리자 계정

1. RDS MySQL에 `backend/schema.sql`을 실행합니다.
2. 기존 DB가 이전 SQL 스키마로 만들어져 있다면 `backend/migrations/001_sql_transition_fixes.sql`을 검토 후 실행합니다. 새 DB라면 실행하지 않아도 됩니다.
3. 관리자 초기 계정을 생성합니다.

```bash
cd backend
npm run seed:admins
```

실행 전 `ADMIN_INITIAL_PASSWORD` 또는 계정별 `ADMIN_HYUNSU_PASSWORD`, `ADMIN_JUYEON_PASSWORD`, `ADMIN_INHO_PASSWORD`, `ADMIN_WONJUN_PASSWORD`를 설정해야 합니다. 이미 있는 계정은 비밀번호를 바꾸지 않고 admin 권한만 유지합니다.

| loginId | 이름 |
|---------|------|
| admin_hyunsu | 조현수 |
| admin_juyeon | 박주연 |
| admin_inho | 최인호 |
| admin_wonjun | 최원준 |

> 초기 비밀번호는 생성 후 반드시 변경하세요. admin 계정은 음원 업로드와 회원 탈퇴가 불가하며, 관리자 콘솔(`/admin`)을 사용합니다.
