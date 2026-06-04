import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCapsLock, CapsLockWarning } from '../hooks/useCapsLock';
import { usePlayer } from '../hooks/usePlayer';
import { updateMe, changePassword, uploadProfileImage, deleteAccount } from '../api/auth';
import { getMyCreatorRequest, createCreatorRequest } from '../api/creatorRequests';
import { getMyUploadedTracks, updateMyUploadedTrack, createTrackDeleteRequest, getMyTrackDeleteRequests } from '../api/myTracks';
import styles from './MyPage.module.css';
import { GENRES as BASE_GENRES } from '../constants/genres';

const GENRES = ['', ...BASE_GENRES];

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
  const { t } = useTranslation();
  const ROLE_LABELS = { user: t('admin.member_role_user'), creator: t('admin.member_role_creator'), admin: t('admin.member_role_admin') };
  const { user, loading, roleLabel, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const { playToDefault } = usePlayer();
  const { search: locationSearch } = useLocation();
  const tabFromUrl = new URLSearchParams(locationSearch).get('tab');
  const validTabIds = ['profile', 'creator'];

  const TABS = [
    { id: 'profile', label: t('mypage.tab_profile') },
    { id: 'creator', label: t('mypage.tab_creator') },
  ];

  const REQUEST_STATUS_LABELS = {
    pending: t('mypage.creator_status_pending'),
    approved: t('mypage.creator_status_approved'),
    rejected: t('mypage.creator_status_rejected'),
  };

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
      setReapplyError(err.response?.data?.error || err.message || t('admin.error_approve'));
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
      setEditTrackError(err.message || t('admin.error_save'));
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
      setDeleteReqError(err.message || t('admin.error_save'));
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
      setEditError(err.response?.data?.error || t('mypage.error_save'));
    } finally {
      setEditSaving(false);
    }
  }

  function handleProfileFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileError(t('mypage.error_profile_size'));
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
      setProfileError(err.response?.data?.message || t('mypage.error_profile_upload'));
    } finally {
      setProfileUploading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (!pwForm.currentPassword) return setPwError(t('mypage.error_pw_current'));
    if (!pwForm.newPassword) return setPwError(t('mypage.error_pw_new'));
    if (pwForm.newPassword.length < 8) return setPwError(t('mypage.error_pw_length'));
    if (!pwForm.confirmPassword) return setPwError(t('mypage.error_pw_confirm'));
    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwError(t('mypage.error_pw_mismatch'));
    setPwSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(err.response?.data?.message || t('mypage.error_pw_change'));
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (deleteConfirm !== '회원탈퇴') {
      setDeleteError(t('mypage.error_delete_confirm_text'));
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (user?.role === 'admin') {
        setDeleteError(t('mypage.error_delete_admin'));
        setDeleteLoading(false);
        return;
      }
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      setDeleteDone(true);
    } catch (err) {
      setDeleteError(err.response?.data?.message || t('mypage.error_delete_failed'));
      setDeleteLoading(false);
    }
  }

  function handleGoToLogin() {
    logout();
    navigate('/login');
  }

  useEffect(() => {
    if (!deleteDone) return;
    const timer = setTimeout(() => {
      logout();
      navigate('/login');
    }, 5000);
    return () => clearTimeout(timer);
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
            <h2 className={styles.farewellTitle}>{t('mypage.farewell_title')}</h2>
            <p className={styles.farewellDesc}>
              {t('mypage.farewell_desc')}
            </p>
            <div className={styles.gateActions}>
              <button type="button" className={styles.gatePrimary} onClick={handleGoToLogin}>
                {t('mypage.login_redirect_btn')}
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
            <h2 className={styles.gateTitle}>{t('mypage.gate_login_required')}</h2>
            <p className={styles.gateDesc}>{t('mypage.gate_login_desc')}</p>
            <div className={styles.gateActions}>
              <Link to="/login" className={styles.gatePrimary}>{t('mypage.gate_login_link')}</Link>
              <Link to="/signup" className={styles.gateSecondary}>{t('mypage.gate_signup_link')}</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>{t('mypage.heading')}</h1>

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
            <p className={styles.tabDesc}>{t('mypage.tab_profile_desc')}</p>

            {/* 프로필 사진 */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('mypage.profile_image_title')}</h2>
              {profileSuccess && <p className={styles.successMsg}>{t('mypage.profile_success')}</p>}
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
                    {t('mypage.profile_pick_button')}
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
                      {profileUploading ? t('mypage.profile_uploading') : t('mypage.profile_upload_button')}
                    </button>
                  )}
                  <p className={styles.editHint}>{t('mypage.profile_hint')}</p>
                </div>
              </div>
              {profileError && <p className={styles.editError}>{profileError}</p>}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t('mypage.info_title')}</h2>
                {!editing && (
                  <button className={styles.editBtn} onClick={startEdit}>{t('mypage.edit_button')}</button>
                )}
              </div>

              {editSuccess && (
                <p className={styles.successMsg}>{t('mypage.edit_success')}</p>
              )}

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('mypage.info_id')}</span>
                <span className={styles.infoValue}>{user.loginId}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('mypage.info_role')}</span>
                <span className={`${styles.roleBadge} ${styles[`role_${user.role}`]}`}>
                  {roleLabel ?? ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>

              {!editing && (
                <div className={styles.infoList}>
                  <InfoRow label={t('mypage.info_name')} value={user.name} />
                  <InfoRow label={t('mypage.info_email')} value={user.email} />
                  <InfoRow label={t('mypage.info_birth')} value={user.birthDate} />
                  <InfoRow label={t('mypage.info_phone')} value={user.phone} />
                  <InfoRow label={t('mypage.info_genre')} value={user.favoriteGenre} />
                  <InfoRow label={t('mypage.info_artist_name')} value={user.artistName} />
                </div>
              )}

              {editing && (
                <form onSubmit={handleSave} className={styles.editForm}>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>{t('mypage.info_name')} <span className={styles.required}>*</span></label>
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
                    <label className={styles.editLabel}>{t('mypage.info_email')} <span className={styles.required}>*</span></label>
                    <input
                      className={styles.editInput}
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>{t('mypage.info_birth')}</label>
                    <input
                      className={styles.editInput}
                      type="date"
                      value={editForm.birthDate}
                      onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))}
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>{t('mypage.edit_phone_label')}</label>
                    <input
                      className={styles.editInput}
                      type="tel"
                      value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>{t('mypage.edit_profile_url_label')}</label>
                    <input
                      className={styles.editInput}
                      type="url"
                      value={editForm.profileImageUrl}
                      onChange={e => setEditForm(f => ({ ...f, profileImageUrl: e.target.value }))}
                      placeholder={t('mypage.edit_profile_url_placeholder')}
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>{t('mypage.info_genre')}</label>
                    <select
                      className={styles.editInput}
                      value={editForm.favoriteGenre}
                      onChange={e => setEditForm(f => ({ ...f, favoriteGenre: e.target.value }))}
                    >
                      {GENRES.map(g => (
                        <option key={g} value={g}>{g || t('signup.no_selection')}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>{t('mypage.info_artist_name')}</label>
                    <input
                      className={styles.editInput}
                      type="text"
                      value={editForm.artistName}
                      onChange={e => setEditForm(f => ({ ...f, artistName: e.target.value }))}
                      placeholder={t('mypage.edit_artist_placeholder')}
                      maxLength={50}
                    />
                    <p className={styles.editHint}>{t('mypage.edit_artist_hint')}</p>
                  </div>
                  {editError && <p className={styles.editError}>{editError}</p>}
                  <div className={styles.editActions}>
                    <button type="submit" className={styles.saveBtn} disabled={editSaving}>
                      {editSaving ? t('mypage.form_save_loading') : t('mypage.form_save_button')}
                    </button>
                    <button type="button" className={styles.cancelBtn} onClick={cancelEdit} disabled={editSaving}>
                      {t('mypage.form_cancel_button')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 비밀번호 변경 */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('mypage.password_title')}</h2>
              {pwSuccess && <p className={styles.successMsg}>{t('mypage.password_success')}</p>}
              <form onSubmit={handleChangePassword} className={styles.editForm}>
                <div className={styles.editField}>
                  <label className={styles.editLabel}>{t('mypage.password_current')}</label>
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
                  <label className={styles.editLabel}>{t('mypage.password_new')}</label>
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
                  <p className={styles.editHint}>{t('mypage.password_hint')}</p>
                </div>
                <div className={styles.editField}>
                  <label className={styles.editLabel}>{t('mypage.password_confirm')}</label>
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
                    {pwSaving ? t('mypage.password_button_loading') : t('mypage.password_button')}
                  </button>
                </div>
              </form>
            </div>

            {/* 회원 탈퇴: 운영 관리자 계정은 보호 */}
            {user?.role !== 'admin' && (
              <div className={styles.dangerZone}>
                <div className={styles.dangerZoneHeader}>
                  <h2 className={styles.dangerZoneTitle}>{t('mypage.delete_account_title')}</h2>
                  <p className={styles.dangerZoneDesc}>{t('mypage.delete_account_desc')}</p>
                </div>
                <button className={styles.dangerBtn} onClick={() => setShowDeleteModal(true)}>
                  {t('mypage.delete_button')}
                </button>
              </div>
            )}

            {showDeleteModal && (
              <div className={styles.modalOverlay} onClick={closeDeleteModal}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                  <h3 className={styles.modalTitle}>{t('mypage.delete_modal_title')}</h3>
                  <p className={styles.modalDesc}>
                    {t('mypage.delete_modal_desc')}
                  </p>
                  <form onSubmit={handleDeleteAccount} className={styles.editForm}>
                    <div className={styles.editField}>
                      <label className={styles.editLabel}>{t('mypage.delete_password_label')}</label>
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
                      <label className={styles.editLabel}>{t('mypage.delete_confirm_label')}</label>
                      <input
                        className={styles.editInput}
                        type="text"
                        value={deleteConfirm}
                        onChange={e => setDeleteConfirm(e.target.value)}
                        placeholder={t('mypage.delete_confirm_placeholder')}
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
                        {deleteLoading ? t('mypage.delete_confirm_button_loading') : t('mypage.delete_confirm_button')}
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={closeDeleteModal}
                        disabled={deleteLoading}
                      >
                        {t('mypage.form_cancel_button')}
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
            <p className={styles.tabDesc}>{t('mypage.creator_tab_desc')}</p>

            {/* admin: 관리자 안내 */}
            {user.role === 'admin' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>{t('mypage.admin_account_title')}</h2>
                <p className={styles.statusInfoMsg}>
                  {t('mypage.admin_account_desc')}
                  <Link to="/admin" className={styles.applyLink} style={{ marginLeft: 0 }}>{t('mypage.creator_admin_link')}</Link>
                </p>
              </div>
            )}

            {/* user: Creator 신청 상태 */}
            {user.role === 'user' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>{t('mypage.creator_section_title')}</h2>

                {request === undefined && (
                  <p className={styles.statusLoading}>{t('common.loading')}</p>
                )}

                {request === null && (
                  <div className={styles.requestDetail}>
                    <p className={styles.statusNone}>{t('mypage.creator_not_applied')}</p>
                    <Link to="/upload" className={styles.applyLink} style={{ marginLeft: 0 }}>{t('mypage.creator_apply_link')}</Link>
                  </div>
                )}

                {request !== null && request !== undefined && (
                  <div className={styles.requestDetail}>
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>{t('mypage.creator_status_label')}</span>
                      <span className={`${styles.statusBadge} ${styles[`status_${request.status}`]}`}>
                        {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                      </span>
                    </div>
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>{t('mypage.creator_artist_name')}</span>
                      <span className={styles.statusValue}>{request.artistName}</span>
                    </div>
                    {request.message && (
                      <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>{t('mypage.creator_message')}</span>
                        <span className={styles.statusValue}>{request.message}</span>
                      </div>
                    )}
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>{t('mypage.creator_applied_date')}</span>
                      <span className={styles.statusValue}>
                        {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    {request.reviewedAt && (
                      <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>{t('mypage.creator_reviewed_date')}</span>
                        <span className={styles.statusValue}>
                          {new Date(request.reviewedAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    )}
                    {request.status === 'pending' && (
                      <p className={styles.statusInfoMsg}>{t('mypage.creator_pending_msg')}</p>
                    )}
                    {request.status === 'approved' && (
                      <div className={styles.requestDetail}>
                        <p className={styles.statusInfoMsg}>{t('mypage.creator_approved_msg')}</p>
                        <Link to="/upload" className={styles.applyLink} style={{ marginLeft: 0 }}>{t('mypage.creator_upload_link')}</Link>
                      </div>
                    )}
                    {request.status === 'rejected' && (
                      <>
                        <div className={styles.rejectReasonBox}>
                          <span className={styles.rejectReasonLabel}>{t('mypage.creator_reject_reason')}</span>
                          <span className={styles.rejectReasonText}>
                            {request.rejectReason || t('mypage.creator_reject_no_reason')}
                          </span>
                        </div>
                        <p className={styles.statusInfoMsg}>{t('mypage.creator_reject_reapply_hint')}</p>
                        {!showReapply ? (
                          <button className={styles.reapplyBtn} onClick={() => setShowReapply(true)}>
                            {t('mypage.creator_reapply_button')}
                          </button>
                        ) : (
                          <form onSubmit={handleReapply} className={styles.reapplyForm}>
                            <textarea
                              className={styles.reapplyTextarea}
                              value={reapplyMsg}
                              onChange={e => setReapplyMsg(e.target.value)}
                              placeholder={t('mypage.reapply_placeholder')}
                              rows={3}
                              maxLength={500}
                            />
                            {reapplyError && <p className={styles.reapplyError}>{reapplyError}</p>}
                            <div className={styles.reapplyActions}>
                              <button type="submit" className={styles.reapplySubmitBtn} disabled={reapplySubmitting}>
                                {reapplySubmitting ? t('mypage.reapply_button_loading') : t('mypage.reapply_button')}
                              </button>
                              <button
                                type="button"
                                className={styles.reapplyCancelBtn}
                                onClick={() => { setShowReapply(false); setReapplyError(''); }}
                              >
                                {t('mypage.form_cancel_button')}
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
                  <h2 className={styles.cardTitle}>{t('mypage.creator_section_title')}</h2>
                  <p className={styles.statusApproved}>{t('mypage.creator_active_msg')}</p>
                  <Link to="/upload" className={styles.applyLink} style={{ marginLeft: 0 }}>{t('mypage.creator_upload_link')}</Link>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{t('mypage.uploaded_tracks_title')}</h2>
                    <Link to="/upload" className={styles.editBtn} style={{ textDecoration: 'none' }}>{t('mypage.uploaded_tracks_new_button')}</Link>
                  </div>

                  {myTracks === undefined && (
                    <p className={styles.statusLoading}>{t('common.loading')}</p>
                  )}
                  {myTracks !== undefined && myTracks.length === 0 && (
                    <div className={styles.uploadEmpty}>
                      <p className={styles.statusNone}>{t('mypage.uploaded_tracks_empty')}</p>
                      <p className={styles.statusNoneSub}>{t('mypage.uploaded_tracks_empty_hint')}</p>
                      <Link to="/upload" className={styles.uploadNewBtn}>{t('mypage.uploaded_tracks_new_link')}</Link>
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
                                    ? <span className={styles.myTrackBadgeDeleted}>{t('mypage.track_status_deleted')}</span>
                                    : <span className={styles.myTrackBadgeActive}>{t('mypage.track_status_active')}</span>
                                  }
                                </div>
                                <p className={styles.myTrackMeta}>
                                  {track.artist}
                                  {track.genre && <span className={styles.myTrackGenreTag}>{track.genre}</span>}
                                </p>
                                {isDeleted ? (
                                  <div className={styles.myTrackDeletedDetail}>
                                    <p className={styles.myTrackDeletedNotice}>{t('mypage.track_deleted_notice')}</p>
                                    <p className={styles.myTrackDeletedMeta}>
                                      {t('mypage.track_deleted_at', { date: new Date(track.deletedAt).toLocaleString() })}
                                    </p>
                                    {track.deleteReason && (
                                      <p className={styles.myTrackDeletedReason}>{t('mypage.track_deleted_reason', { reason: track.deleteReason })}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className={styles.myTrackDate}>
                                    {t('mypage.track_uploaded_date', { date: new Date(track.createdAt).toLocaleDateString() })}
                                  </p>
                                )}
                              </div>
                            </div>
                            {!isDeleted && (
                              <div className={styles.myTrackActions}>
                                <button
                                  className={styles.myTrackPlayBtn}
                                  onClick={() => playToDefault(track)}
                                  aria-label={t('player.play_button_title')}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </button>
                                <button className={styles.myTrackEditBtn} onClick={() => openEditTrack(track)}>
                                  {t('mypage.track_edit_button')}
                                </button>
                                {myDeleteReqs.some(r => r.trackId === track.id && r.status === 'pending') ? (
                                  <span className={styles.myTrackPendingBadge}>{t('mypage.track_delete_request_pending')}</span>
                                ) : (
                                  <button className={styles.myTrackDeleteReqBtn} onClick={() => openDeleteReq(track)}>
                                    {t('mypage.track_delete_request_button')}
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
                    <h2 className={styles.cardTitle}>{t('mypage.delete_requests_title')}</h2>
                    <ul className={styles.deleteReqList}>
                      {myDeleteReqs.map(r => (
                        <li key={r.id} className={styles.deleteReqItem}>
                          <div className={styles.deleteReqInfo}>
                            <p className={styles.deleteReqTitle}>{r.trackTitle}</p>
                            {r.reason && <p className={styles.deleteReqReason}>"{r.reason}"</p>}
                            <p className={styles.deleteReqDate}>{t('mypage.delete_req_date', { date: new Date(r.createdAt).toLocaleDateString() })}</p>
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
              <h3 className={styles.modalTitle}>{t('mypage.track_edit_modal_title')}</h3>
              <button className={styles.modalClose} onClick={() => setEditTrackTarget(null)} disabled={editTrackSaving}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('mypage.track_edit_artist_label')}</label>
                <p className={styles.modalReadOnly}>{editTrackTarget.artist}</p>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('mypage.track_edit_title_label')}</label>
                <input className={styles.modalInput} value={editTrackForm.title} onChange={e => setEditTrackForm(f => ({ ...f, title: e.target.value }))} maxLength={100} />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('mypage.track_edit_genre_label')}</label>
                <select className={styles.modalSelect} value={editTrackForm.genre} onChange={e => setEditTrackForm(f => ({ ...f, genre: e.target.value }))}>
                  <option value="">{t('signup.no_selection')}</option>
                  {['Pop', 'Hip-Hop', 'Electronic', 'Rock', 'Jazz', 'Classical', 'R&B', 'Lo-fi', 'Other'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('mypage.track_edit_cover_label')}</label>
                <input className={styles.modalInput} value={editTrackForm.coverUrl} onChange={e => setEditTrackForm(f => ({ ...f, coverUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('mypage.track_edit_desc_label')}</label>
                <textarea className={styles.modalTextarea} value={editTrackForm.description} onChange={e => setEditTrackForm(f => ({ ...f, description: e.target.value }))} rows={3} maxLength={500} />
              </div>
              {editTrackError && <p className={styles.modalError}>{editTrackError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalSaveBtn} onClick={handleEditTrackSave} disabled={editTrackSaving}>
                {editTrackSaving ? t('mypage.form_save_loading') : t('mypage.form_save_button')}
              </button>
              <button className={styles.modalCancelBtn} onClick={() => setEditTrackTarget(null)} disabled={editTrackSaving}>{t('mypage.form_cancel_button')}</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 요청 모달 */}
      {deleteReqTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleteReqSubmitting && setDeleteReqTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t('mypage.delete_req_modal_title')}</h3>
              <button className={styles.modalClose} onClick={() => setDeleteReqTarget(null)} disabled={deleteReqSubmitting}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalConfirmText}>
                <strong>"{deleteReqTarget.title}"</strong> {t('mypage.delete_req_modal_confirm')}
              </p>
              <p className={styles.modalConfirmSub}>
                {t('mypage.delete_req_modal_sub')}
              </p>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>{t('mypage.delete_req_reason_label')}</label>
                <textarea
                  className={styles.modalTextarea}
                  value={deleteReqReason}
                  onChange={e => setDeleteReqReason(e.target.value)}
                  placeholder={t('mypage.delete_req_reason_placeholder')}
                  rows={3}
                  maxLength={300}
                />
              </div>
              {deleteReqError && <p className={styles.modalError}>{deleteReqError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalDeleteBtn} onClick={handleDeleteReqSubmit} disabled={deleteReqSubmitting}>
                {deleteReqSubmitting ? t('mypage.delete_req_submitting') : t('mypage.delete_req_submit_button')}
              </button>
              <button className={styles.modalCancelBtn} onClick={() => setDeleteReqTarget(null)} disabled={deleteReqSubmitting}>{t('mypage.form_cancel_button')}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
