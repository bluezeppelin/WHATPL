# WHATPL SQL 전환 수정 보고서

## 완료한 작업

1. 트랙 삭제 참조 정리 안정화
- `backend/lib/trackReferenceCleanup.js` 추가
- soft delete 시 playlist/like/recentlyPlayed/playerSession/playerQueue 참조를 먼저 정리하도록 변경
- hard delete 시 trackDeleteRequests까지 먼저 정리한 뒤 S3 삭제 시도, hard delete log 기록, 마지막으로 tracks 삭제하도록 순서 변경

2. `/api/tracks/:id` DELETE 정책 정리
- 기존 물리 삭제를 soft delete로 변경
- S3 파일 즉시 삭제 제거
- 영구 삭제는 admin hard delete API에서만 수행하도록 정책을 맞춤

3. 삭제/정지 트랙 재생수 증가 차단
- `POST /api/tracks/:id/play`에서 `status !== 'active'`이면 410 응답

4. 플레이리스트 중복 트랙 허용 복구
- `playlistStore.addTrack()`의 중복 차단 제거
- `routes/playlists.js`의 alreadyExists 409 응답 제거
- 같은 trackId를 여러 번 넣어도 각각 별도 row로 저장되게 변경

5. 플레이리스트 row 식별자 추가
- `playlist_tracks.id` 컬럼 추가
- 중복 트랙 삭제 시 trackId만으로 여러 개가 같이 삭제되지 않도록 row id 기준 삭제
- 삭제 후 position 재정렬 처리

6. player_queue row 식별자 추가
- `player_queue.id` 컬럼 추가
- 중복 큐 항목을 안정적으로 보존할 수 있게 변경

7. 회원탈퇴 FK 오류 가능성 완화
- 유저가 업로드한 트랙 삭제 전에 관련 참조를 먼저 정리하도록 변경

8. admin seed 스크립트 추가
- `backend/scripts/seedAdmins.js` 추가
- `npm run seed:admins` 스크립트 추가
- admin 4개가 없으면 생성, 이미 있으면 role/status를 admin/active로 유지

9. SQL migration 파일 추가
- `backend/migrations/001_sql_transition_fixes.sql` 추가
- 기존 DB가 이미 만들어진 경우 playlist_tracks/player_queue id 컬럼을 추가할 수 있게 준비

10. 배포 설정 보강
- `.gitignore`에 backup/uploads/dist/.claude 제외 추가
- `backend/.env.example`에 admin seed password env 추가
- `frontend/.env.production`을 실제 API URL로 교체해야 한다는 형태로 명확화
- README에 SQL/RDS 배포 직전 필수 작업 추가

## 확인한 것

- 변경된 backend JS 파일 `node --check` 통과
- frontend `npm ci` 후 `npm run build` 통과
- 더미 환경변수로 backend server load 확인

## 사용자가 해야 할 작업

1. 로컬에서 수정본 압축 해제 후 `npm install` 또는 `npm ci` 실행
2. RDS 또는 로컬 MySQL에 fresh DB면 `backend/schema.sql` 실행
3. 이미 예전 SQL schema를 적용한 DB라면 `backend/migrations/001_sql_transition_fixes.sql`을 검토 후 실행
4. `backend/.env` 생성/수정
   - JWT_SECRET
   - DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME
   - AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/S3_BUCKET_NAME
   - FRONTEND_URL
   - ADMIN_INITIAL_PASSWORD 또는 admin별 password env
5. admin 4개 seed 실행

```bash
cd backend
npm run seed:admins
```

6. `frontend/.env.production`의 `VITE_API_BASE_URL`을 실제 백엔드 주소로 변경
7. 프론트 빌드

```bash
cd frontend
npm ci
npm run build
```

8. 테스트
- admin 4개 로그인
- 일반 user 가입 후 Creator 신청 가능
- admin 업로드 불가
- creator 업로드 가능
- 같은 곡 플레이리스트 중복 추가 가능
- 중복 곡 하나 삭제 시 하나만 삭제
- 삭제된 트랙 재생수 증가 차단
- soft delete 후 Home/Explore/Player/Playlist에서 사라지는지 확인
- hard delete 시 FK 오류 없이 삭제되는지 확인

