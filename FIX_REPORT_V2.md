# WHATPL SQL 전환 안정화 v2 수정 보고

## 적용한 핵심 수정

1. 공개 트랙 상세 API 보안/노출 수정
- `GET /api/tracks/:id`가 `active` 트랙만 반환하도록 수정.
- `deleted` / `suspended` 트랙은 공개 상세 페이지에서 404 처리.

2. 기본 재생목록 순서 불일치 수정
- 프론트 `playToDefault()`에서 새 곡을 화면상 맨 위에 추가한 뒤, DB 기본 재생목록도 같은 순서로 `PUT /api/playlists/0/tracks` 동기화하도록 수정.
- 기존 `POST /playlists/0/tracks` append 방식으로 인해 새로고침 후 순서가 뒤집히던 문제를 방지.

3. 플레이리스트 hydrate / reorder 입력 안정화
- 플레이리스트 응답 hydrate 시 active 트랙만 포함.
- 전체 트랙 목록 교체 API에서 존재하고 active인 trackId만 DB에 저장하도록 필터링.

4. player session 저장 안정화
- `PUT /api/player-session`에서 현재 트랙과 queueTrackIds를 저장하기 전에 존재 여부와 `active` 상태를 검증.
- 삭제/정지/없는 trackId가 session/queue에 저장되어 FK 오류 또는 복원 오류를 만들 가능성 감소.

5. 관리자 계정 보호
- backend `DELETE /api/auth/me`에서 admin 계정 회원탈퇴 차단.
- frontend MyPage에서도 admin 계정에는 회원탈퇴 danger zone을 표시하지 않도록 수정.

6. creator 탈퇴 후 구독 기록 잔여 정리
- 회원탈퇴 시 사용자의 `artistName`을 다른 사용자가 구독한 `followed_artists` 문자열 기록도 삭제.
- 문자열 기반 follow 구조에서 creator 탈퇴 후 죽은 구독 기록이 남는 문제 완화.

7. MyPage 음원 수정 폼 불일치 제거
- DB/schema/store에 없는 `album`, `releaseYear`, `trackNumber` 입력 UI와 backend 처리 제거.
- 입력은 되지만 저장되지 않는 가짜 필드 문제 제거.

8. 좋아요 카운트 race condition 완화
- `INSERT IGNORE`가 실제로 insert된 경우에만 `tracks.likes + 1` 수행.
- 동시 좋아요 요청에서 likes 숫자가 row 수보다 커지는 문제 완화.

9. CORS 운영 편의성 개선
- `FRONTEND_URL`을 comma-separated multi origin으로 받을 수 있게 수정.
- 예: `FRONTEND_URL=https://whatpl.com,https://www.whatpl.com,http://localhost:5173`

10. unused/vulnerable dependency 제거 및 audit 개선
- 실제 코드에서 쓰지 않는 `music-metadata`, `@aws-sdk/s3-request-presigner` 제거.
- `uuid`를 `11.1.1`로 업데이트.
- backend `npm audit --omit=dev --audit-level=moderate` 기준 0 vulnerabilities 확인.

## 검사 결과

- backend JS syntax check: 통과
- frontend `npm ci`: 통과
- frontend `npm run build`: 통과
- backend production audit: 0 vulnerabilities

## 아직 네가 직접 해야 하는 것

1. 실제 RDS/MySQL에서 `backend/schema.sql` fresh 적용 또는 기존 DB면 migration 적용 전 `SHOW CREATE TABLE` 확인.
2. backend `.env`에 DB/RDS/S3/JWT/admin seed 비밀번호 입력.
3. `cd backend && npm run seed:admins` 실행.
4. frontend `.env.production`의 `VITE_API_BASE_URL`을 실제 백엔드 주소로 변경 후 build.
5. 실제 브라우저에서 admin/user/creator 역할별 전체 기능 테스트.

## 배포 전 필수 테스트

- admin 4개 로그인 가능
- admin 회원탈퇴 불가
- admin 업로드 불가
- 일반 user 회원가입 가능
- 일반 user Creator 신청 가능
- admin이 Creator 신청 승인 가능
- creator 업로드 가능
- Home/Explore/TrackDetail에서 deleted/suspended 트랙 미노출
- 기본 재생목록에 새 곡 추가 시 맨 위 표시 유지, 새로고침 후에도 순서 유지
- 같은 곡 중복 추가/중복 삭제/세션 복원 확인
- hard delete / soft delete FK 오류 없는지 확인
- S3 업로드/삭제 정상 확인
