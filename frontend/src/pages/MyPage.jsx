import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCapsLock, CapsLockWarning } from '../hooks/useCapsLock';
import { usePlayer } from '../hooks/usePlayer';
import { updateMe, changePassword, uploadProfileImage, deleteAccount } from '../api/auth';
import { getMyCreatorRequest, createCreatorRequest } from '../api/creatorRequests';
import { getMyUploadedTracks, updateMyUploadedTrack, createTrackDeleteRequest, getMyTrackDeleteRequests } from '../api/myTracks';
import styles from './MyPage.module.css';
import { GENRES as BASE_GENRES } from '../constants/genres';

const ROLE_LABELS = { user: '일반회원', creator: 'Creator 회원', admin: '관리자' };
const REQUEST_STATUS_LABELS = { pending: '승인 대기중', approved: '승인됨', rejected: '반려됨' };
const GENRES = ['', ...BASE_GENRES];

const TABS = [
  { id: 'profile', label: '프로필' },
  { id: 'creator', label: 'Creator 관리' },
];

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}


export default function MyPage() {
  const { user, loading, roleLabel, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const { playToDefault } = usePlayer();
  const { search: locationSearch } = useLocation();
  const tabFromUrl = new URLSearchParams(locationSearch).get('tab');
  const validTabIds = ['profile', 'creator'];
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && validTabIds.includes(tabFromUrl) ? tabFromUrl : 'profile'
  );
  const [request, setRequest] = useState(undefined);
  const [showReapply, setShowReapply] = useState(false);
  const [reapplyMsg, setReapplyMsg] = useState('');
  const [reapplySubmitting, setReapplySubmitting] = useState(false);
  const [reapplyError, setReapplyError] = useState('');
  const [myTracks, setMyTracks] = useState(undefined);
  const [myDeleteReqs, setMyDeleteReqs] = useState([]);

  // 음원 수정 모달
  const [editTrackTarget, setEditTrackTarget] = useState(null);
  const [editTrackForm, setEditTrackForm] = useState({});
  const [editTrackSaving, setEditTrackSaving] = useState(false);
  const [editTrackError, setEditTrackError] = useState('');

  // 삭제 요청 모달
  const [deleteReqTarget, setDeleteReqTarget] = useState(null);
  const [deleteReqReason, setDeleteReqReason] = useState('');
  const [deleteReqSubmitting, setDeleteReqSubmitting] = useState(false);
  const [deleteReqError, setDeleteReqError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteDone, setDeleteDone] = useState(false);
  const pwCurrentCaps = useCapsLock();
  const pwNewCaps = useCapsLock();
  const pwConfirmCaps = useCapsLock();
  const pwDeleteCaps = useCapsLock();

  useEffect(() => {
    if (user) {
      getMyCreatorRequest()
        .then(data => setRequest(data.request))
        .catch(() => setRequest(null));
      if (user.role === 'creator') {
        getMyUploadedTracks()
          .then(data => setMyTracks(data.tracks))
          .catch(() => setMyTracks([]));
        getMyTrackDeleteRequests()
          .then(data => setMyDeleteReqs(data.requests))
          .catch(() => setMyDeleteReqs([]));
      }
    }
  }, [user]);

  async function handleReapply(e) {
    e.preventDefault();
    setReapplySubmitting(true);
    setReapplyError('');
    try {
      const data = await createCreatorRequest(reapplyMsg);
      setRequest(data.request);
      setShowReapply(false);
      setReapplyMsg('');
    } catch (err) {
      setReapplyError(err.response?.data?.error || err.message || '신청에 실패했습니다.');
    } finally {
      setReapplySubmitting(false);
    }
  }

  function openEditTrack(track) {
    setEditTrackTarget(track);
    setEditTrackForm({
      title: track.title || '',
      genre: track.genre || '',
      description: track.description || '',
      coverUrl: track.coverUrl || '',
    });
    setEditTrackError('');
  }

  async function handleEditTrackSave() {
    setEditTrackSaving(true);
    setEditTrackError('');
    try {
      const data = await updateMyUploadedTrack(editTrackTarget.id, editTrackForm);
      setMyTracks(prev => prev.map(t => t.id === editTrackTarget.id ? data.track : t));
      setEditTrackTarget(null);
    } catch (err) {
      setEditTrackError(err.message || '수정에 실패했습니다.');
    } finally {
      setEditTrackSaving(false);
    }
  }

  function openDeleteReq(track) {
    setDeleteReqTarget(track);
    setDeleteReqReason('');
    setDeleteReqError('');
  }

  async function handleDeleteReqSubmit() {
    setDeleteReqSubmitting(true);
    setDeleteReqError('');
    try {
      const data = await createTrackDeleteRequest(deleteReqTarget.id, deleteReqReason);
      setMyDeleteReqs(prev => [...prev, data.request]);
      setDeleteReqTarget(null);
    } catch (err) {
      setDeleteReqError(err.message || '삭제 요청에 실패했습니다.');
    } finally {
      setDeleteReqSubmitting(false);
    }
  }

  function startEdit() {
    setEditForm({
      email: user.email || '',
      name: user.name || '',
      birthDate: user.birthDate || '',
      phone: user.phone || '',
      profileImageUrl: user.profileImageUrl || '',
      favoriteGenre: user.favoriteGenre || '',
      artistName: user.artistName || '',
    });
    setEditError('');
    setEditSuccess(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      await updateMe(editForm);
      await refreshUser();
      setEditing(false);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err) {
      setEditError(err.response?.data?.error || '저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setEditSaving(false);
    }
  }

  function handleProfileFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('파일 크기는 2MB 이하여야 합니다.');
      return;
    }
    setProfileError('');
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  }

  async function handleProfileUpload() {
    if (!profileFile) return;
    setProfileUploading(true);
    setProfileError('');
    try {
      await uploadProfileImage(profileFile);
      await refreshUser();
      setProfileFile(null);
      setProfilePreview('');
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.message || '업로드에 실패했습니다.');
    } finally {
      setProfileUploading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (!pwForm.currentPassword) return setPwError('현재 비밀번호를 입력해주세요.');
    if (!pwForm.newPassword) return setPwError('새 비밀번호를 입력해주세요.');
    if (pwForm.newPassword.length < 8) return setPwError('새 비밀번호는 8자 이상이어야 합니다.');
    if (!pwForm.confirmPassword) return setPwError('새 비밀번호 확인을 입력해주세요.');
    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwError('새 비밀번호와 확인이 일치하지 않습니다.');
    setPwSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(err.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (deleteConfirm !== '회원탈퇴') {
      setDeleteError('"회원탈퇴"를 정확히 입력해주세요.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (user?.role === 'admin') {
        setDeleteError('관리자 계정은 회원탈퇴할 수 없습니다.');
        setDeleteLoading(false);
        return;
      }
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      setDeleteDone(true);
    } catch (err) {
      setDeleteError(err.response?.data?.message || '탈퇴 처리 중 오류가 발생했습니다.');
      setDeleteLoading(false);
    }
  }

  function handleGoToLogin() {
    logout();
    navigate('/login');
  }

  useEffect(() => {
    if (!deleteDone) return;
    const t = setTimeout(() => {
      logout();
      navigate('/login');
    }, 5000);
    return () => clearTimeout(t);
  }, [deleteDone]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeDeleteModal() {
    if (deleteLoading) return;
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteConfirm('');
    setDeleteError('');
  }

  if (deleteDone) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.farewellCard}>
            <div className={styles.farewellIcon}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <h2 className={styles.farewellTitle}>회원탈퇴가 완료되었습니다.</h2>
            <p className={styles.farewellDesc}>
              그동안 WHATPL을 이용해주셔서 감사합니다.
            </p>
            <div className={styles.gateActions}>
              <button type="button" className={styles.gatePrimary} onClick={handleGoToLogin}>
                로그인 화면으로 이동
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return <main className={styles.page}><div className={styles.container} /></main>;
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.gateBox}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="var(--text-tertiary)">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <h2 className={styles.gateTitle}>로그인이 필요합니다</h2>
            <p className={styles.gateDesc}>마이페이지를 보려면 먼저 로그인해주세요.</p>
            <div className={styles.gateActions}>
              <Link to="/login" className={styles.gatePrimary}>로그인</Link>
              <Link to="/signup" className={styles.gateSecondary}>회원가입</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>마이페이지</h1>

        {/* 탭 네비게이션 — Creator 관리는 creator 전용 */}
        <nav className={styles.tabs}>
          {TABS.filter(tab => tab.id !== 'creator' || user.role === 'creator' || user.role === 'user').map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 프로필 탭 */}
        {activeTab === 'profile' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>내 계정 정보를 확인하고 수정하세요.</p>

            {/* 프로필 사진 */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>프로필 사진</h2>
              {profileSuccess && <p className={styles.successMsg}>프로필 사진이 업데이트되었습니다.</p>}
              <div className={styles.profileImageSection}>
                <div className={styles.profileAvatar}>
                  {(profilePreview || user.profileImageUrl) ? (
                    <img
                      src={profilePreview || user.profileImageUrl}
                      alt="프로필"
                      className={styles.profileAvatarImg}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span className={styles.profileAvatarInitial}>
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={styles.profileImageActions}>
                  <label className={styles.profilePickBtn}>
                    사진 선택
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className={styles.profileFileInput}
                      onChange={handleProfileFileChange}
                    />
                  </label>
                  {profileFile && (
                    <button
                      className={styles.profileUploadBtn}
                      onClick={handleProfileUpload}
                      disabled={profileUploading}
                    >
                      {profileUploading ? '업로드 중...' : '업로드'}
                    </button>
                  )}
                  <p className={styles.editHint}>jpg, png, webp · 최대 2MB</p>
                </div>
              </div>
              {profileError && <p className={styles.editError}>{profileError}</p>}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>내 정보</h2>
                {!editing && (
                  <button className={styles.editBtn} onClick={startEdit}>정보 수정</button>
                )}
              </div>

              {editSuccess && (
                <p className={styles.successMsg}>정보가 성공적으로 저장되었습니다.</p>
              )}

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>아이디</span>
                <span className={styles.infoValue}>{user.loginId}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>회원등급</span>
                <span className={`${styles.roleBadge} ${styles[`role_${user.role}`]}`}>
                  {roleLabel ?? ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>

              {!editing && (
                <div className={styles.infoList}>
                  <InfoRow label="성명" value={user.name} />
                  <InfoRow label="이메일" value={user.email} />
                  <InfoRow label="생년월일" value={user.birthDate} />
                  <InfoRow label="휴대폰" value={user.phone} />
                  <InfoRow label="좋아하는 장르" value={user.favoriteGenre} />
                  <InfoRow label="크리에이터명" value={user.artistName} />
                </div>
              )}

              {editing && (
                <form onSubmit={handleSave} className={styles.editForm}>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>성명 <span className={styles.required}>*</span></label>
                    <input
                      className={styles.editInput}
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      required
                      maxLength={50}
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>이메일 <span className={styles.required}>*</span></label>
                    <input
                      className={styles.editInput}
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>생년월일</label>
                    <input
                      className={styles.editInput}
                      type="date"
                      value={editForm.birthDate}
                      onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))}
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>휴대폰 번호</label>
                    <input
                      className={styles.editInput}
                      type="tel"
                      value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>프로필 이미지 URL</label>
                    <input
                      className={styles.editInput}
                      type="url"
                      value={editForm.profileImageUrl}
                      onChange={e => setEditForm(f => ({ ...f, profileImageUrl: e.target.value }))}
                      placeholder="이미지 URL"
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>좋아하는 장르</label>
                    <select
                      className={styles.editInput}
                      value={editForm.favoriteGenre}
                      onChange={e => setEditForm(f => ({ ...f, favoriteGenre: e.target.value }))}
                    >
                      {GENRES.map(g => (
                        <option key={g} value={g}>{g || '선택 안함'}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>크리에이터명</label>
                    <input
                      className={styles.editInput}
                      type="text"
                      value={editForm.artistName}
                      onChange={e => setEditForm(f => ({ ...f, artistName: e.target.value }))}
                      placeholder="활동할 크리에이터 이름"
                      maxLength={50}
                    />
                    <p className={styles.editHint}>선택사항입니다. 추후 Creator 회원 전환 시 크리에이터명으로 사용됩니다.</p>
                  </div>
                  {editError && <p className={styles.editError}>{editError}</p>}
                  <div className={styles.editActions}>
                    <button type="submit" className={styles.saveBtn} disabled={editSaving}>
                      {editSaving ? '저장 중...' : '저장'}
                    </button>
                    <button type="button" className={styles.cancelBtn} onClick={cancelEdit} disabled={editSaving}>
                      취소
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 비밀번호 변경 */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>비밀번호 변경</h2>
              {pwSuccess && <p className={styles.successMsg}>비밀번호가 성공적으로 변경되었습니다.</p>}
              <form onSubmit={handleChangePassword} className={styles.editForm}>
                <div className={styles.editField}>
                  <label className={styles.editLabel}>현재 비밀번호</label>
                  <input
                    className={styles.editInput}
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                    onKeyDown={pwCurrentCaps.handler}
                    onKeyUp={pwCurrentCaps.handler}
                    onBlur={pwCurrentCaps.reset}
                    autoComplete="current-password"
                  />
                  <CapsLockWarning on={pwCurrentCaps.on} />
                </div>
                <div className={styles.editField}>
                  <label className={styles.editLabel}>새 비밀번호</label>
                  <input
                    className={styles.editInput}
                    type="password"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                    onKeyDown={pwNewCaps.handler}
                    onKeyUp={pwNewCaps.handler}
                    onBlur={pwNewCaps.reset}
                    autoComplete="new-password"
                  />
                  <CapsLockWarning on={pwNewCaps.on} />
                  <p className={styles.editHint}>8자 이상 입력해주세요.</p>
                </div>
                <div className={styles.editField}>
                  <label className={styles.editLabel}>새 비밀번호 확인</label>
                  <input
                    className={styles.editInput}
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    onKeyDown={pwConfirmCaps.handler}
                    onKeyUp={pwConfirmCaps.handler}
                    onBlur={pwConfirmCaps.reset}
                    autoComplete="new-password"
                  />
                  <CapsLockWarning on={pwConfirmCaps.on} />
                </div>
                {pwError && <p className={styles.editError}>{pwError}</p>}
                <div className={styles.editActions}>
                  <button type="submit" className={styles.saveBtn} disabled={pwSaving}>
                    {pwSaving ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              </form>
            </div>

            {/* 회원 탈퇴: 운영 관리자 계정은 보호 */}
            {user?.role !== 'admin' && (
              <div className={styles.dangerZone}>
                <div className={styles.dangerZoneHeader}>
                  <h2 className={styles.dangerZoneTitle}>회원 탈퇴</h2>
                  <p className={styles.dangerZoneDesc}>탈퇴 시 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.</p>
                </div>
                <button className={styles.dangerBtn} onClick={() => setShowDeleteModal(true)}>
                  회원 탈퇴
                </button>
              </div>
            )}

            {showDeleteModal && (
              <div className={styles.modalOverlay} onClick={closeDeleteModal}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>정말 탈퇴하시겠습니까?</h3>
                  <p className={styles.modalDesc}>
                    탈퇴 시 업로드한 음원, 좋아요, 플레이리스트, 팔로우 기록 등<br />
                    모든 데이터가 <strong>영구 삭제</strong>되며 복구할 수 없습니다.
                  </p>
                  <form onSubmit={handleDeleteAccount} className={styles.editForm}>
                    <div className={styles.editField}>
                      <label className={styles.editLabel}>현재 비밀번호</label>
                      <input
                        className={styles.editInput}
                        type="password"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        onKeyDown={pwDeleteCaps.handler}
                        onKeyUp={pwDeleteCaps.handler}
                        onBlur={pwDeleteCaps.reset}
                        autoComplete="current-password"
                        disabled={deleteLoading}
                      />
                      <CapsLockWarning on={pwDeleteCaps.on} />
                    </div>
                    <div className={styles.editField}>
                      <label className={styles.editLabel}>확인을 위해 <strong>회원탈퇴</strong>를 입력하세요</label>
                      <input
                        className={styles.editInput}
                        type="text"
                        value={deleteConfirm}
                        onChange={e => setDeleteConfirm(e.target.value)}
                        placeholder="회원탈퇴"
                        disabled={deleteLoading}
                      />
                    </div>
                    {deleteError && <p className={styles.editError}>{deleteError}</p>}
                    <div className={styles.modalActions}>
                      <button
                        type="submit"
                        className={styles.dangerConfirmBtn}
                        disabled={deleteLoading || !deletePassword || deleteConfirm !== '회원탈퇴'}
                      >
                        {deleteLoading ? '처리 중...' : '탈퇴 확인'}
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={closeDeleteModal}
                        disabled={deleteLoading}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Creator 관리 탭 */}
        {activeTab === 'creator' && (user.role === 'creator' || user.role === 'user') && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>Creator 신청 상태와 업로드한 음악을 관리하세요.</p>

            {/* admin: 관리자 안내 */}
            {user.role === 'admin' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>관리자 계정</h2>
                <p className={styles.statusInfoMsg}>
                  관리자 기능은{' '}
                  <Link to="/admin" className={styles.applyLink} style={{ marginLeft: 0 }}>관리자 페이지</Link>
                  에서 관리하세요.
                </p>
              </div>
            )}

            {/* user: Creator 신청 상태 */}
            {user.role === 'user' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Creator 신청 상태</h2>

                {request === undefined && (
                  <p className={styles.statusLoading}>불러오는 중...</p>
                )}

                {request === null && (
                  <div className={styles.requestDetail}>
                    <p className={styles.statusNone}>Creator 신청을 아직 하지 않았습니다.</p>
                    <Link to="/upload" className={styles.applyLink} style={{ marginLeft: 0 }}>Creator 신청하러 가기 →</Link>
                  </div>
                )}

                {request !== null && request !== undefined && (
                  <div className={styles.requestDetail}>
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>상태</span>
                      <span className={`${styles.statusBadge} ${styles[`status_${request.status}`]}`}>
                        {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                      </span>
                    </div>
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>신청 크리에이터명</span>
                      <span className={styles.statusValue}>{request.artistName}</span>
                    </div>
                    {request.message && (
                      <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>신청 메시지</span>
                        <span className={styles.statusValue}>{request.message}</span>
                      </div>
                    )}
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>신청일</span>
                      <span className={styles.statusValue}>
                        {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    {request.reviewedAt && (
                      <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>처리일</span>
                        <span className={styles.statusValue}>
                          {new Date(request.reviewedAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    )}
                    {request.status === 'pending' && (
                      <p className={styles.statusInfoMsg}>관리자 검토 후 승인되면 음원을 업로드할 수 있습니다.</p>
                    )}
                    {request.status === 'approved' && (
                      <div className={styles.requestDetail}>
                        <p className={styles.statusInfoMsg}>이제 Creator 회원으로 음원을 업로드할 수 있습니다.</p>
                        <Link to="/upload" className={styles.applyLink} style={{ marginLeft: 0 }}>음원 업로드하러 가기 →</Link>
                      </div>
                    )}
                    {request.status === 'rejected' && (
                      <>
                        <div className={styles.rejectReasonBox}>
                          <span className={styles.rejectReasonLabel}>반려 사유</span>
                          <span className={styles.rejectReasonText}>
                            {request.rejectReason || '반려 사유가 입력되지 않았습니다.'}
                          </span>
                        </div>
                        <p className={styles.statusInfoMsg}>내용을 보완하여 다시 신청할 수 있습니다.</p>
                        {!showReapply ? (
                          <button className={styles.reapplyBtn} onClick={() => setShowReapply(true)}>
                            다시 신청하기
                          </button>
                        ) : (
                          <form onSubmit={handleReapply} className={styles.reapplyForm}>
                            <textarea
                              className={styles.reapplyTextarea}
                              value={reapplyMsg}
                              onChange={e => setReapplyMsg(e.target.value)}
                              placeholder="신청 메시지 (선택사항)"
                              rows={3}
                              maxLength={500}
                            />
                            {reapplyError && <p className={styles.reapplyError}>{reapplyError}</p>}
                            <div className={styles.reapplyActions}>
                              <button type="submit" className={styles.reapplySubmitBtn} disabled={reapplySubmitting}>
                                {reapplySubmitting ? '신청 중...' : '신청하기'}
                              </button>
                              <button
                                type="button"
                                className={styles.reapplyCancelBtn}
                                onClick={() => { setShowReapply(false); setReapplyError(''); }}
                              >
                                취소
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* creator: Creator 신청 상태 (활동 중 표시) + 업로드 음원 관리 */}
            {user.role === 'creator' && (
              <>
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Creator 신청 상태</h2>
                  <p className={styles.statusApproved}>Creator 회원으로 활동 중입니다.</p>
                  <Link to="/upload" className={styles.applyLink} style={{ marginLeft: 0 }}>음원 업로드하러 가기 →</Link>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>업로드한 음원 관리</h2>
                    <Link to="/upload" className={styles.editBtn} style={{ textDecoration: 'none' }}>+ 새 업로드</Link>
                  </div>

                  {myTracks === undefined && (
                    <p className={styles.statusLoading}>불러오는 중...</p>
                  )}
                  {myTracks !== undefined && myTracks.length === 0 && (
                    <div className={styles.uploadEmpty}>
                      <p className={styles.statusNone}>아직 업로드한 음원이 없습니다.</p>
                      <p className={styles.statusNoneSub}>나만의 사운드를 WHATPL에 공유해보세요.</p>
                      <Link to="/upload" className={styles.uploadNewBtn}>첫 음원 업로드하기 →</Link>
                    </div>
                  )}
                  {myTracks !== undefined && myTracks.length > 0 && (
                    <ul className={styles.myTrackList}>
                      {myTracks.map(track => {
                        const isDeleted = track.status === 'deleted';
                        return (
                          <li key={track.id} className={`${styles.myTrackItem} ${isDeleted ? styles.myTrackItemDeleted : ''}`}>
                            <div className={styles.myTrackLeft}>
                              {track.coverUrl ? (
                                <img src={track.coverUrl} alt={track.title} className={styles.myTrackCover} />
                              ) : (
                                <div className={styles.myTrackCoverPlaceholder}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-tertiary)">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                  </svg>
                                </div>
                              )}
                              <div className={styles.myTrackInfo}>
                                <div className={styles.myTrackTitleRow}>
                                  <span className={styles.myTrackTitle}>{track.title}</span>
                                  {isDeleted
                                    ? <span className={styles.myTrackBadgeDeleted}>삭제됨</span>
                                    : <span className={styles.myTrackBadgeActive}>정상</span>
                                  }
                                </div>
                                <p className={styles.myTrackMeta}>
                                  {track.artist}
                                  {track.genre && <span className={styles.myTrackGenreTag}>{track.genre}</span>}
                                </p>
                                {isDeleted ? (
                                  <div className={styles.myTrackDeletedDetail}>
                                    <p className={styles.myTrackDeletedNotice}>관리자에 의해 삭제된 음원입니다.</p>
                                    <p className={styles.myTrackDeletedMeta}>
                                      삭제 일시: {new Date(track.deletedAt).toLocaleString('ko-KR')}
                                    </p>
                                    {track.deleteReason && (
                                      <p className={styles.myTrackDeletedReason}>삭제 사유: {track.deleteReason}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className={styles.myTrackDate}>
                                    업로드: {new Date(track.createdAt).toLocaleDateString('ko-KR')}
                                  </p>
                                )}
                              </div>
                            </div>
                            {!isDeleted && (
                              <div className={styles.myTrackActions}>
                                <button
                                  className={styles.myTrackPlayBtn}
                                  onClick={() => playToDefault(track)}
                                  aria-label="재생"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </button>
                                <button className={styles.myTrackEditBtn} onClick={() => openEditTrack(track)}>
                                  수정
                                </button>
                                {myDeleteReqs.some(r => r.trackId === track.id && r.status === 'pending') ? (
                                  <span className={styles.myTrackPendingBadge}>삭제 요청 대기 중</span>
                                ) : (
                                  <button className={styles.myTrackDeleteReqBtn} onClick={() => openDeleteReq(track)}>
                                    삭제 요청
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* 삭제 요청 내역 */}
                {myDeleteReqs.length > 0 && (
                  <div className={styles.card}>
                    <h2 className={styles.cardTitle}>삭제 요청 내역</h2>
                    <ul className={styles.deleteReqList}>
                      {myDeleteReqs.map(r => (
                        <li key={r.id} className={styles.deleteReqItem}>
                          <div className={styles.deleteReqInfo}>
                            <p className={styles.deleteReqTitle}>{r.trackTitle}</p>
                            {r.reason && <p className={styles.deleteReqReason}>"{r.reason}"</p>}
                            <p className={styles.deleteReqDate}>신청일: {new Date(r.createdAt).toLocaleDateString('ko-KR')}</p>
                          </div>
                          <span className={`${styles.statusBadge} ${styles[`status_${r.status}`]}`}>
                            {REQUEST_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        )}

      </div>

      {/* 음원 정보 수정 모달 */}
      {editTrackTarget && (
        <div className={styles.modalOverlay} onClick={() => !editTrackSaving && setEditTrackTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>음원 정보 수정</h3>
              <button className={styles.modalClose} onClick={() => setEditTrackTarget(null)} disabled={editTrackSaving}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>크리에이터명 (변경 불가)</label>
                <p className={styles.modalReadOnly}>{editTrackTarget.artist}</p>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>제목 *</label>
                <input className={styles.modalInput} value={editTrackForm.title} onChange={e => setEditTrackForm(f => ({ ...f, title: e.target.value }))} maxLength={100} />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>장르</label>
                <select className={styles.modalSelect} value={editTrackForm.genre} onChange={e => setEditTrackForm(f => ({ ...f, genre: e.target.value }))}>
                  <option value="">선택 안 함</option>
                  {['Pop', 'Hip-Hop', 'Electronic', 'Rock', 'Jazz', 'Classical', 'R&B', 'Lo-fi', 'Other'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>커버 이미지 URL</label>
                <input className={styles.modalInput} value={editTrackForm.coverUrl} onChange={e => setEditTrackForm(f => ({ ...f, coverUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>설명</label>
                <textarea className={styles.modalTextarea} value={editTrackForm.description} onChange={e => setEditTrackForm(f => ({ ...f, description: e.target.value }))} rows={3} maxLength={500} />
              </div>
              {editTrackError && <p className={styles.modalError}>{editTrackError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalSaveBtn} onClick={handleEditTrackSave} disabled={editTrackSaving}>
                {editTrackSaving ? '저장 중...' : '저장'}
              </button>
              <button className={styles.modalCancelBtn} onClick={() => setEditTrackTarget(null)} disabled={editTrackSaving}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 요청 모달 */}
      {deleteReqTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleteReqSubmitting && setDeleteReqTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>삭제 요청</h3>
              <button className={styles.modalClose} onClick={() => setDeleteReqTarget(null)} disabled={deleteReqSubmitting}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalConfirmText}>
                <strong>"{deleteReqTarget.title}"</strong> 음원의 삭제를 관리자에게 요청합니다.
              </p>
              <p className={styles.modalConfirmSub}>
                관리자 승인 후 삭제 처리됩니다. 직접 삭제는 불가하며, 잘못 올린 경우 새로 업로드해주세요.
              </p>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>삭제 사유 (선택)</label>
                <textarea
                  className={styles.modalTextarea}
                  value={deleteReqReason}
                  onChange={e => setDeleteReqReason(e.target.value)}
                  placeholder="삭제 이유를 입력해주세요..."
                  rows={3}
                  maxLength={300}
                />
              </div>
              {deleteReqError && <p className={styles.modalError}>{deleteReqError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalDeleteBtn} onClick={handleDeleteReqSubmit} disabled={deleteReqSubmitting}>
                {deleteReqSubmitting ? '요청 중...' : '삭제 요청 제출'}
              </button>
              <button className={styles.modalCancelBtn} onClick={() => setDeleteReqTarget(null)} disabled={deleteReqSubmitting}>취소</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
