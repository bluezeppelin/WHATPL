import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCreatorRequests, approveCreatorRequest, rejectCreatorRequest } from '../api/creatorRequests';
import { getAdminTracks, updateAdminTrack, deleteAdminTrack, getAdminDeleteRequests, approveDeleteRequest, rejectDeleteRequest, hardDeleteTrack, getHardDeleteLogs } from '../api/adminTracks';
import { getAdminUsers, deactivateUser, activateUser } from '../api/adminUsers';
import { getSiteSettings, updateSiteTheme, uploadSiteLogo, uploadHeroBackground } from '../api/siteSettings';
import { reauthAdmin } from '../api/adminAuth';
import { getServerMonitoring } from '../api/adminMonitoring';
import { applyTheme } from '../utils/theme';
import { useCapsLock, CapsLockWarning } from '../hooks/useCapsLock';
import styles from './Admin.module.css';
import { GENRES as TRACK_GENRES } from '../constants/genres';

const TABS = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'creator-requests', label: 'Creator 신청' },
  { id: 'delete-requests', label: '음원 삭제 요청' },
  { id: 'tracks', label: '음원 관리' },
  { id: 'members', label: '회원 관리' },
  { id: 'site-settings', label: '사이트 설정' },
  { id: 'delete-logs', label: '삭제 로그' },
  { id: 'server-monitor', label: '서버 모니터링' },
];

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function MonBar({ label, pct, variant }) {
  const fillClass = pct == null ? '' :
    pct > 85 ? 'monBarFillDanger' :
    pct > 70 ? 'monBarFillWarn' :
    variant === 'heap' ? 'monBarFillHeap' :
    variant === 'mem' ? 'monBarFillMem' :
    'monBarFillCpu';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{label}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0' }}>{pct != null ? `${pct}%` : 'N/A'}</span>
      </div>
      <div style={{ height: 7, background: '#1e1e35', borderRadius: 2, overflow: 'hidden' }}>
        <div className={fillClass ? `${fillClass}` : ''} style={{
          height: '100%', borderRadius: 2,
          width: `${pct != null ? Math.min(pct, 100) : 0}%`,
          transition: 'width 0.5s ease',
          background: pct == null ? 'transparent' :
            pct > 85 ? 'linear-gradient(90deg,#ff4646,#ff2020)' :
            pct > 70 ? 'linear-gradient(90deg,#ffc800,#ff6b00)' :
            variant === 'heap' ? 'linear-gradient(90deg,#ff8c42,#ffc800)' :
            variant === 'mem' ? 'linear-gradient(90deg,#00c875,#00ff64)' :
            'linear-gradient(90deg,#4a9eff,#7c5cfc)',
        }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { pending: '대기중', approved: '승인됨', rejected: '반려됨' };
  return <span className={`${styles.badge} ${styles[`badge_${status}`]}`}>{map[status] ?? status}</span>;
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Creator 신청 상태
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [rejectReasons, setRejectReasons] = useState({});
  const [rejectOpen, setRejectOpen] = useState({});

  // 회원 관리 상태
  const [members, setMembers] = useState([]);
  const [membersFetching, setMembersFetching] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('');

  // 삭제 요청 관리 상태
  const [deleteReqs, setDeleteReqs] = useState([]);
  const [deleteReqsFetching, setDeleteReqsFetching] = useState(true);
  const [deleteReqsError, setDeleteReqsError] = useState('');
  const [drRejectOpen, setDrRejectOpen] = useState({});
  const [drRejectReasons, setDrRejectReasons] = useState({});

  // 관리자 재인증 상태
  const [reauthVerified, setReauthVerified] = useState(false);
  const [reauthPw, setReauthPw] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const pwReauthCaps = useCapsLock();

  // 브랜딩 설정 상태
  const DEFAULT_THEME = { mainColor: '#7c3aed', subColor1: '#a78bfa', subColor2: '#312e81', subColor3: '#111827' };
  const [brandTheme, setBrandTheme] = useState(DEFAULT_THEME);
  const [brandLogoFile, setBrandLogoFile] = useState(null);
  const [brandLogoFileName, setBrandLogoFileName] = useState('');
  const [currentLogoUrl, setCurrentLogoUrl] = useState('');
  const [heroBgFile, setHeroBgFile] = useState(null);
  const [heroBgFileName, setHeroBgFileName] = useState('');
  const [currentHeroBgUrl, setCurrentHeroBgUrl] = useState('');
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMsg, setBrandMsg] = useState('');
  const [brandError, setBrandError] = useState('');

  // 영구 삭제 상태
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null);
  const [hardDeleteConfirmText, setHardDeleteConfirmText] = useState('');
  const [hardDeleteConfirming, setHardDeleteConfirming] = useState(false);

  // 음원 관리 상태
  const [tracks, setTracks] = useState([]);
  const [tracksFetching, setTracksFetching] = useState(true);
  const [tracksError, setTracksError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', description: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  // 삭제 로그 상태
  const [hardDeleteLogs, setHardDeleteLogs] = useState([]);
  const [hardDeleteLogsFetching, setHardDeleteLogsFetching] = useState(true);

  // 서버 모니터링 상태
  const [monitorData, setMonitorData] = useState(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorStatus, setMonitorStatus] = useState('online');
  const monitorIntervalRef = useRef(null);

  const fetchMonitorData = useCallback(async (showLoading = false) => {
    if (showLoading) setMonitorLoading(true);
    try {
      const data = await getServerMonitoring();
      setMonitorData(data);
      setMonitorStatus(data.status || 'online');
    } catch {
      setMonitorStatus('error');
    } finally {
      if (showLoading) setMonitorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'server-monitor' || !reauthVerified) {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
      return;
    }
    fetchMonitorData(true);
    monitorIntervalRef.current = setInterval(() => fetchMonitorData(false), 3000);
    return () => {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    };
  }, [activeTab, reauthVerified, fetchMonitorData]);

  async function loadBrandSettings() {
    try {
      const data = await getSiteSettings();
      setBrandTheme(data.theme || DEFAULT_THEME);
      setCurrentLogoUrl(data.logoUrl || '');
      setCurrentHeroBgUrl(data.heroBackgroundUrl || '');
    } catch {}
  }

  function handleBrandPreview() {
    applyTheme(brandTheme);
  }

  async function handleBrandApply() {
    setBrandSaving(true);
    setBrandMsg('');
    setBrandError('');
    try {
      let updated = await updateSiteTheme(brandTheme);

      if (brandLogoFile) {
        try {
          updated = await uploadSiteLogo(brandLogoFile);
        } catch {
          setBrandError('색상은 저장되었으나 로고 업로드에 실패했습니다. (jpg, png, webp · 최대 2MB)');
          applyTheme(updated.theme);
          window.dispatchEvent(new CustomEvent('site-settings-changed', {
            detail: { theme: updated.theme, logoUrl: updated.logoUrl, heroBackgroundUrl: updated.heroBackgroundUrl },
          }));
          return;
        }
      }

      if (heroBgFile) {
        try {
          updated = await uploadHeroBackground(heroBgFile);
        } catch {
          setBrandError('색상/로고는 저장되었으나 배경 이미지 업로드에 실패했습니다. (jpg, png, webp · 최대 5MB)');
          applyTheme(updated.theme);
          window.dispatchEvent(new CustomEvent('site-settings-changed', {
            detail: { theme: updated.theme, logoUrl: updated.logoUrl, heroBackgroundUrl: updated.heroBackgroundUrl },
          }));
          return;
        }
      }

      setCurrentLogoUrl(updated.logoUrl || '');
      setCurrentHeroBgUrl(updated.heroBackgroundUrl || '');
      setBrandTheme(updated.theme || DEFAULT_THEME);
      setBrandLogoFile(null);
      setBrandLogoFileName('');
      setHeroBgFile(null);
      setHeroBgFileName('');
      applyTheme(updated.theme);
      window.dispatchEvent(new CustomEvent('site-settings-changed', {
        detail: { theme: updated.theme, logoUrl: updated.logoUrl, heroBackgroundUrl: updated.heroBackgroundUrl },
      }));
      setBrandMsg('설정이 저장되었습니다.');
      setTimeout(() => setBrandMsg(''), 3000);
    } catch (err) {
      setBrandError(err.response?.data?.error || err.message || '저장에 실패했습니다.');
    } finally {
      setBrandSaving(false);
    }
  }

  async function handleReauth(e) {
    e.preventDefault();
    setReauthLoading(true);
    setReauthError('');
    try {
      const data = await reauthAdmin(reauthPw);
      sessionStorage.setItem('adminReauthToken', data.adminReauthToken);
      sessionStorage.setItem('adminReauthExpiry', String(Date.now() + data.expiresIn * 1000));
      setReauthPw('');
      setReauthVerified(true);
    } catch (err) {
      setReauthError(err.message || '비밀번호 확인에 실패했습니다.');
    } finally {
      setReauthLoading(false);
    }
  }

  async function handleHardDelete() {
    if (hardDeleteConfirmText !== 'DELETE') return;
    setHardDeleteConfirming(true);
    try {
      await hardDeleteTrack(hardDeleteTarget.id);
      setHardDeleteTarget(null);
      setHardDeleteConfirmText('');
      loadTracks();
      loadHardDeleteLogs();
    } catch (err) {
      if (err.message?.includes('재인증') || err.message?.includes('만료')) {
        sessionStorage.removeItem('adminReauthToken');
        sessionStorage.removeItem('adminReauthExpiry');
        setReauthVerified(false);
        alert('재인증 토큰이 만료되었습니다. 비밀번호를 다시 확인해주세요.');
      } else {
        alert(err.message || '영구 삭제에 실패했습니다.');
      }
    } finally {
      setHardDeleteConfirming(false);
    }
  }

  async function loadRequests() {
    setFetching(true);
    setError('');
    try {
      const data = await getCreatorRequests();
      setRequests(data.requests);
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setFetching(false);
    }
  }

  async function loadMembers(role, status) {
    setMembersFetching(true);
    setMembersError('');
    try {
      const data = await getAdminUsers({ role: role || undefined, status: status || undefined });
      setMembers(data.users);
    } catch {
      setMembersError('회원 목록을 불러오지 못했습니다.');
    } finally {
      setMembersFetching(false);
    }
  }

  async function loadDeleteReqs() {
    setDeleteReqsFetching(true);
    setDeleteReqsError('');
    try {
      const data = await getAdminDeleteRequests();
      setDeleteReqs(data.requests);
    } catch {
      setDeleteReqsError('삭제 요청 목록을 불러오지 못했습니다.');
    } finally {
      setDeleteReqsFetching(false);
    }
  }

  async function loadTracks() {
    setTracksFetching(true);
    setTracksError('');
    try {
      const data = await getAdminTracks();
      setTracks(data.tracks);
    } catch {
      setTracksError('음원 목록을 불러오지 못했습니다.');
    } finally {
      setTracksFetching(false);
    }
  }

  async function loadHardDeleteLogs() {
    setHardDeleteLogsFetching(true);
    try {
      const data = await getHardDeleteLogs();
      setHardDeleteLogs(data.logs || []);
    } catch {
      setHardDeleteLogs([]);
    } finally {
      setHardDeleteLogsFetching(false);
    }
  }

  // 재인증 토큰 확인
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const token = sessionStorage.getItem('adminReauthToken');
    const expiry = parseInt(sessionStorage.getItem('adminReauthExpiry') || '0', 10);
    if (token && expiry > Date.now()) {
      setReauthVerified(true);
    }
  }, [user]);

  // 데이터 로드 (재인증 완료 후)
  useEffect(() => {
    if (user?.role === 'admin' && reauthVerified) {
      loadBrandSettings();
      loadRequests();
      loadDeleteReqs();
      loadTracks();
      loadMembers('', '');
      loadHardDeleteLogs();
    }
  }, [user, reauthVerified]);

  async function handleApprove(id) {
    try {
      await approveCreatorRequest(id);
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.error || '승인에 실패했습니다.');
    }
  }

  async function handleReject(id) {
    try {
      await rejectCreatorRequest(id, rejectReasons[id] || '');
      setRejectOpen(prev => ({ ...prev, [id]: false }));
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.error || '반려에 실패했습니다.');
    }
  }

  async function handleDrApprove(id) {
    try {
      await approveDeleteRequest(id);
      loadDeleteReqs();
      loadTracks();
    } catch (err) {
      alert(err.message || '승인에 실패했습니다.');
    }
  }

  async function handleDrReject(id) {
    try {
      await rejectDeleteRequest(id, drRejectReasons[id] || '');
      setDrRejectOpen(prev => ({ ...prev, [id]: false }));
      loadDeleteReqs();
    } catch (err) {
      alert(err.message || '반려에 실패했습니다.');
    }
  }

  async function handleDeactivate(member) {
    if (!window.confirm(`"${member.name} (${member.loginId})" 계정을 비활성화하시겠습니까?\n비활성화된 계정은 로그인할 수 없습니다.`)) return;
    try {
      await deactivateUser(member.id);
      loadMembers(memberRoleFilter, memberStatusFilter);
    } catch (err) {
      alert(err.message || '비활성화에 실패했습니다.');
    }
  }

  async function handleActivate(member) {
    try {
      await activateUser(member.id);
      loadMembers(memberRoleFilter, memberStatusFilter);
    } catch (err) {
      alert(err.message || '활성화에 실패했습니다.');
    }
  }

  function handleMemberFilterChange(role, status) {
    setMemberRoleFilter(role);
    setMemberStatusFilter(status);
    loadMembers(role, status);
  }

  function openEdit(track) {
    setEditTarget(track);
    setEditForm({
      title: track.title || '',
      artist: track.artist || '',
      genre: track.genre || '',
      description: track.description || '',
    });
    setEditError('');
  }

  async function handleEditSave() {
    setEditSaving(true);
    setEditError('');
    try {
      await updateAdminTrack(editTarget.id, editForm);
      setEditTarget(null);
      loadTracks();
    } catch (err) {
      setEditError(err.message || '수정에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  }

  function openDelete(track) {
    setDeleteTarget(track);
    setDeleteReason('');
  }

  async function handleDeleteConfirm() {
    setDeleteConfirming(true);
    try {
      await deleteAdminTrack(deleteTarget.id, deleteReason);
      setDeleteTarget(null);
      loadTracks();
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다.');
    } finally {
      setDeleteConfirming(false);
    }
  }

  if (loading) {
    return <main className={styles.page}><div className={styles.container} /></main>;
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.gateBox}>
            <h2 className={styles.gateTitle}>로그인이 필요합니다</h2>
            <div className={styles.gateActions}>
              <Link to="/login" className={styles.gatePrimary}>로그인</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (user.role !== 'admin') {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.gateBox}>
            <h2 className={styles.gateTitle}>관리자만 접근할 수 있습니다</h2>
            <p className={styles.gateDesc}>이 페이지는 관리자 계정으로만 접근 가능합니다.</p>
            <div className={styles.gateActions}>
              <Link to="/" className={styles.gatePrimary}>홈으로</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!reauthVerified) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.gateBox}>
            <h2 className={styles.gateTitle}>관리자 인증 확인</h2>
            <p className={styles.gateDesc}>보안을 위해 현재 비밀번호를 다시 확인합니다.</p>
            <form onSubmit={handleReauth} className={styles.reauthForm}>
              <input
                type="password"
                className={styles.reauthInput}
                placeholder="현재 비밀번호"
                value={reauthPw}
                onChange={e => setReauthPw(e.target.value)}
                onKeyDown={pwReauthCaps.handler}
                onKeyUp={pwReauthCaps.handler}
                onBlur={pwReauthCaps.reset}
                autoFocus
              />
              <CapsLockWarning on={pwReauthCaps.on} />
              {reauthError && <p className={styles.reauthError}>{reauthError}</p>}
              <button
                type="submit"
                className={styles.reauthSubmitBtn}
                disabled={reauthLoading || !reauthPw}
              >
                {reauthLoading ? '확인 중...' : '확인'}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  const statCreators = members.filter(m => m.role === 'creator' && (m.status || 'active') === 'active').length;
  const statActiveTracks = tracks.filter(t => t.status !== 'deleted').length;
  const statPendingCreator = requests.filter(r => r.status === 'pending').length;
  const statPendingDelete = deleteReqs.filter(r => r.status === 'pending').length;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>관리자</h1>

        {/* 탭 네비게이션 */}
        <nav className={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'creator-requests' && statPendingCreator > 0 && (
                <span className={styles.tabBadge}>{statPendingCreator}</span>
              )}
              {tab.id === 'delete-requests' && statPendingDelete > 0 && (
                <span className={styles.tabBadge}>{statPendingDelete}</span>
              )}
            </button>
          ))}
        </nav>

        {/* 대시보드 탭 */}
        {activeTab === 'dashboard' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>WHATPL 서비스 현황을 한눈에 확인하세요.</p>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{members.length}</span>
                <span className={styles.statLabel}>전체 회원</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{statCreators}</span>
                <span className={styles.statLabel}>활성 Creator</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{statActiveTracks}</span>
                <span className={styles.statLabel}>활성 음원</span>
              </div>
              <div className={`${styles.statCard} ${statPendingCreator > 0 ? styles.statCardAlert : ''}`}>
                <span className={styles.statValue}>{statPendingCreator}</span>
                <span className={styles.statLabel}>Creator 신청 대기</span>
              </div>
              <div className={`${styles.statCard} ${statPendingDelete > 0 ? styles.statCardAlert : ''}`}>
                <span className={styles.statValue}>{statPendingDelete}</span>
                <span className={styles.statLabel}>삭제 요청 대기</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{hardDeleteLogs.length}</span>
                <span className={styles.statLabel}>영구 삭제 기록</span>
              </div>
            </div>
          </section>
        )}

        {/* Creator 신청 탭 */}
        {activeTab === 'creator-requests' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>Creator 신청 목록을 검토하고 승인 또는 반려하세요.</p>
            {error && <p className={styles.errorMsg}>{error}</p>}
            {fetching ? (
              <p className={styles.loading}>불러오는 중...</p>
            ) : requests.length === 0 ? (
              <p className={styles.empty}>대기 중인 Creator 신청이 없습니다.</p>
            ) : (
              <div className={styles.list}>
                {requests.map(r => (
                  <div key={r.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardInfo}>
                        <span className={styles.artistName}>{r.artistName}</span>
                        <span className={styles.userName}>{r.name} ({r.loginId})</span>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.message && <p className={styles.message}>"{r.message}"</p>}
                    <p className={styles.date}>신청일: {new Date(r.createdAt).toLocaleString('ko-KR')}</p>
                    {r.status === 'pending' && (
                      <div className={styles.actions}>
                        <button className={styles.approveBtn} onClick={() => handleApprove(r.id)}>승인 처리</button>
                        <button className={styles.rejectToggleBtn} onClick={() => setRejectOpen(prev => ({ ...prev, [r.id]: !prev[r.id] }))}>반려 처리</button>
                      </div>
                    )}
                    {r.status === 'pending' && rejectOpen[r.id] && (
                      <div className={styles.rejectBox}>
                        <input
                          className={styles.rejectInput}
                          type="text"
                          placeholder="반려 사유 (선택)"
                          value={rejectReasons[r.id] || ''}
                          onChange={e => setRejectReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                          maxLength={200}
                        />
                        <button className={styles.rejectConfirmBtn} onClick={() => handleReject(r.id)}>반려 확정</button>
                      </div>
                    )}
                    {r.status === 'rejected' && r.rejectReason && (
                      <p className={styles.rejectReason}>반려 사유: {r.rejectReason}</p>
                    )}
                    {r.reviewedAt && (
                      <p className={styles.reviewedAt}>처리일: {new Date(r.reviewedAt).toLocaleString('ko-KR')} ({r.reviewedBy})</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 음원 삭제 요청 탭 */}
        {activeTab === 'delete-requests' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>Creator가 요청한 음원 삭제를 검토하고 처리하세요.</p>
            {deleteReqsError && <p className={styles.errorMsg}>{deleteReqsError}</p>}
            {deleteReqsFetching ? (
              <p className={styles.loading}>불러오는 중...</p>
            ) : deleteReqs.length === 0 ? (
              <p className={styles.empty}>대기 중인 음원 삭제 요청이 없습니다.</p>
            ) : (
              <div className={styles.list}>
                {deleteReqs.map(r => (
                  <div key={r.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardInfo}>
                        <span className={styles.artistName}>{r.trackTitle}</span>
                        <span className={styles.userName}>요청자: {r.artistName} ({r.creatorLoginId})</span>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.reason && <p className={styles.message}>"{r.reason}"</p>}
                    <p className={styles.date}>요청일: {new Date(r.createdAt).toLocaleString('ko-KR')}</p>
                    {r.status === 'pending' && (
                      <div className={styles.actions}>
                        <button className={styles.approveBtn} onClick={() => handleDrApprove(r.id)}>승인 처리</button>
                        <button className={styles.rejectToggleBtn} onClick={() => setDrRejectOpen(prev => ({ ...prev, [r.id]: !prev[r.id] }))}>반려 처리</button>
                      </div>
                    )}
                    {r.status === 'pending' && drRejectOpen[r.id] && (
                      <div className={styles.rejectBox}>
                        <input
                          className={styles.rejectInput}
                          type="text"
                          placeholder="반려 사유 (선택)"
                          value={drRejectReasons[r.id] || ''}
                          onChange={e => setDrRejectReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                          maxLength={200}
                        />
                        <button className={styles.rejectConfirmBtn} onClick={() => handleDrReject(r.id)}>반려 확정</button>
                      </div>
                    )}
                    {r.status === 'rejected' && r.rejectReason && (
                      <p className={styles.rejectReason}>반려 사유: {r.rejectReason}</p>
                    )}
                    {r.reviewedAt && (
                      <p className={styles.reviewedAt}>처리일: {new Date(r.reviewedAt).toLocaleString('ko-KR')} ({r.reviewedBy})</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 음원 관리 탭 */}
        {activeTab === 'tracks' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>전체 음원을 조회하고 수정·삭제하세요. 소프트 삭제된 음원은 영구 삭제할 수 있습니다.</p>
            {tracksError && <p className={styles.errorMsg}>{tracksError}</p>}
            {tracksFetching ? (
              <p className={styles.loading}>불러오는 중...</p>
            ) : tracks.length === 0 ? (
              <p className={styles.empty}>조건에 맞는 음원을 찾을 수 없습니다.</p>
            ) : (
              <div className={styles.trackList}>
                {tracks.map(t => {
                  const isDeleted = t.status === 'deleted';
                  return (
                    <div key={t.id} className={`${styles.trackCard} ${isDeleted ? styles.trackCardDeleted : ''}`}>
                      {t.coverUrl ? (
                        <img src={t.coverUrl} alt={t.title} className={styles.trackCover} />
                      ) : (
                        <div className={styles.trackCoverPlaceholder}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-tertiary)">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                        </div>
                      )}
                      <div className={styles.trackInfo}>
                        <div className={styles.trackTitleRow}>
                          <p className={styles.trackTitle}>{t.title}</p>
                          {isDeleted && <span className={styles.deletedBadge}>삭제됨</span>}
                        </div>
                        <p className={styles.trackMeta}>
                          {t.artist}
                          {t.genre && <span className={styles.trackGenreTag}>{t.genre}</span>}
                        </p>
                        {isDeleted && (
                          <p className={styles.trackDeletedInfo}>
                            {new Date(t.deletedAt).toLocaleString('ko-KR')} · {t.deletedBy}
                            {t.deleteReason && ` · "${t.deleteReason}"`}
                          </p>
                        )}
                        {!isDeleted && t.uploadedByUserId && (
                          <p className={styles.trackUploader}>업로더 ID: {t.uploadedByUserId}</p>
                        )}
                      </div>
                      <div className={styles.trackActions}>
                        {!isDeleted && (
                          <>
                            <button className={styles.trackEditBtn} onClick={() => openEdit(t)}>수정</button>
                            <button className={styles.trackDeleteBtn} onClick={() => openDelete(t)}>소프트 삭제</button>
                          </>
                        )}
                        {isDeleted && (
                          <button
                            className={styles.trackHardDeleteBtn}
                            onClick={() => { setHardDeleteTarget(t); setHardDeleteConfirmText(''); }}
                          >
                            영구 삭제
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 회원 관리 탭 */}
        {activeTab === 'members' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>전체 회원 목록을 조회하고 계정을 관리하세요.</p>
            <div className={styles.memberFilters}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>역할</span>
                {[['', '전체'], ['user', '일반회원'], ['creator', 'Creator'], ['admin', '관리자']].map(([val, label]) => (
                  <button
                    key={val}
                    className={`${styles.filterBtn} ${memberRoleFilter === val ? styles.filterBtnActive : ''}`}
                    onClick={() => handleMemberFilterChange(val, memberStatusFilter)}
                  >{label}</button>
                ))}
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>상태</span>
                {[['', '전체'], ['active', '활성'], ['inactive', '비활성']].map(([val, label]) => (
                  <button
                    key={val}
                    className={`${styles.filterBtn} ${memberStatusFilter === val ? styles.filterBtnActive : ''}`}
                    onClick={() => handleMemberFilterChange(memberRoleFilter, val)}
                  >{label}</button>
                ))}
              </div>
            </div>
            {membersError && <p className={styles.errorMsg}>{membersError}</p>}
            {membersFetching ? (
              <p className={styles.loading}>불러오는 중...</p>
            ) : members.length === 0 ? (
              <p className={styles.empty}>조건에 맞는 회원을 찾을 수 없습니다.</p>
            ) : (
              <div className={styles.memberList}>
                {members.map(m => {
                  const isInactive = (m.status || 'active') === 'inactive';
                  const roleMap = { user: '일반회원', creator: 'Creator', admin: '관리자' };
                  const canDeactivate = m.role !== 'admin' && m.id !== user.id;
                  return (
                    <div key={m.id} className={`${styles.memberCard} ${isInactive ? styles.memberCardInactive : ''}`}>
                      <div className={styles.memberAvatar}>
                        {m.profileImageUrl ? (
                          <img src={m.profileImageUrl} alt={m.name} className={styles.memberAvatarImg}
                            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <span className={styles.memberAvatarInitial} style={m.profileImageUrl ? { display: 'none' } : {}}>
                          {m.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberTopRow}>
                          <span className={styles.memberLoginId}>{m.loginId}</span>
                          <span className={`${styles.memberRoleBadge} ${styles[`role_${m.role}`]}`}>{roleMap[m.role] ?? m.role}</span>
                          <span className={`${styles.memberStatusBadge} ${isInactive ? styles.statusInactive : styles.statusActive}`}>
                            {isInactive ? '비활성' : '활성'}
                          </span>
                        </div>
                        <div className={styles.memberMeta}>
                          <span>{m.name}</span>
                          {m.email && <><span className={styles.memberDot}>·</span><span>{m.email}</span></>}
                          {m.artistName && <><span className={styles.memberDot}>·</span><span className={styles.memberArtist}>{m.artistName}</span></>}
                        </div>
                        <div className={styles.memberDates}>
                          가입일: {new Date(m.createdAt).toLocaleDateString('ko-KR')}
                          {isInactive && m.deactivatedAt && (
                            <span className={styles.memberDeactivatedInfo}> · 비활성화: {new Date(m.deactivatedAt).toLocaleString('ko-KR')}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.memberActions}>
                        {isInactive ? (
                          <button className={styles.activateBtn} onClick={() => handleActivate(m)}>계정 활성화</button>
                        ) : (
                          canDeactivate && (
                            <button className={styles.deactivateBtn} onClick={() => handleDeactivate(m)}>계정 비활성화</button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 사이트 설정 탭 */}
        {activeTab === 'site-settings' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>사이트 로고, 배경 이미지, 테마 색상을 설정하세요.</p>
            <div className={styles.brandCard}>

              <div>
                <p className={styles.brandSubLabel}>사이트 로고</p>
                <div className={styles.brandLogoRow}>
                  {currentLogoUrl ? (
                    <img src={currentLogoUrl} alt="현재 로고" className={styles.brandLogoImg} />
                  ) : (
                    <div className={styles.brandLogoPlaceholder}>로고 없음</div>
                  )}
                  <div className={styles.brandLogoFileArea}>
                    <label className={styles.brandFileLabel}>
                      이미지 선택
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBrandLogoFile(file);
                            setBrandLogoFileName(file.name);
                          }
                        }}
                      />
                    </label>
                    <p className={styles.brandFileName}>
                      {brandLogoFileName || 'jpg, png, webp · 최대 2MB'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className={styles.brandSubLabel}>배경 이미지</p>
                <div className={styles.brandLogoRow}>
                  {currentHeroBgUrl ? (
                    <img src={currentHeroBgUrl} alt="현재 배경 이미지" className={styles.brandHeroBgImg} />
                  ) : (
                    <div className={styles.brandLogoPlaceholder}>배경 없음</div>
                  )}
                  <div className={styles.brandLogoFileArea}>
                    <label className={styles.brandFileLabel}>
                      이미지 선택
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setHeroBgFile(file);
                            setHeroBgFileName(file.name);
                          }
                        }}
                      />
                    </label>
                    <p className={styles.brandFileName}>
                      {heroBgFileName || 'jpg, png, webp · 최대 5MB'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className={styles.brandSubLabel}>테마 색상</p>
                <div className={styles.brandColorGrid}>
                  {[
                    { key: 'mainColor', label: '메인 컬러' },
                    { key: 'subColor1', label: '서브 컬러 1' },
                    { key: 'subColor2', label: '서브 컬러 2' },
                    { key: 'subColor3', label: '서브 컬러 3' },
                  ].map(({ key, label }) => (
                    <div key={key} className={styles.brandColorItem}>
                      <span className={styles.brandColorLabel}>{label}</span>
                      <input
                        type="color"
                        className={styles.brandColorSwatch}
                        value={brandTheme[key] || '#000000'}
                        onChange={e => setBrandTheme(t => ({ ...t, [key]: e.target.value }))}
                        title={label}
                      />
                      <span className={styles.brandColorHex}>{brandTheme[key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.brandActions}>
                <button
                  className={styles.brandPreviewBtn}
                  onClick={handleBrandPreview}
                  disabled={brandSaving}
                >
                  미리보기
                </button>
                <button
                  className={styles.brandApplyBtn}
                  onClick={handleBrandApply}
                  disabled={brandSaving}
                >
                  {brandSaving ? '저장 중...' : '적용'}
                </button>
                {brandMsg && <p className={styles.brandSuccessMsg}>{brandMsg}</p>}
                {brandError && <p className={styles.brandErrorMsg}>{brandError}</p>}
              </div>

            </div>
          </section>
        )}

        {/* 삭제 로그 탭 */}
        {activeTab === 'delete-logs' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>관리자가 영구 삭제 처리한 음원 기록입니다.</p>
            {hardDeleteLogsFetching ? (
              <p className={styles.loading}>불러오는 중...</p>
            ) : hardDeleteLogs.length === 0 ? (
              <p className={styles.empty}>영구 삭제 기록이 없습니다.</p>
            ) : (
              <div className={styles.logList}>
                {[...hardDeleteLogs].reverse().map(log => (
                  <div key={log.id} className={styles.logCard}>
                    <div className={styles.logInfo}>
                      <p className={styles.logTitle}>{log.title}</p>
                      <p className={styles.logMeta}>{log.artist}</p>
                      {log.reason && <p className={styles.logReason}>{log.reason}</p>}
                    </div>
                    <div className={styles.logRight}>
                      <p className={styles.logBy}>{log.deletedBy}</p>
                      <p className={styles.logDate}>{new Date(log.deletedAt).toLocaleString('ko-KR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 서버 모니터링 탭 */}
        {activeTab === 'server-monitor' && (
          <section className={styles.tabContent}>
            {/* 헤더 */}
            <div className={styles.monHeader}>
              <span className={styles.monTitle}>SERVER MONITOR</span>
              <span className={`${styles.monBadge} ${
                monitorStatus === 'online' ? styles.monBadgeOnline :
                monitorStatus === 'degraded' ? styles.monBadgeDegraded :
                styles.monBadgeError
              }`}>
                <span className={styles.monBadgeDot} />
                {monitorStatus.toUpperCase()}
              </span>
            </div>
            <p className={styles.monDesc}>
              현재 요청을 처리한 백엔드 인스턴스 기준 모니터링입니다.
              AWS CloudWatch 연동 메트릭(ASG 전체 CPU, ALB 요청 수 등)은 포함되지 않습니다.
            </p>
            <div className={styles.monMetaRow}>
              <span className={styles.monUpdatedAt}>
                {monitorData
                  ? `UPDATED ${new Date(monitorData.serverTime).toLocaleTimeString('ko-KR')}`
                  : monitorLoading ? 'LOADING...' : '--'}
              </span>
              <button
                className={styles.monRefreshBtn}
                onClick={() => fetchMonitorData(true)}
                disabled={monitorLoading}
              >
                ↻ REFRESH
              </button>
              <span className={styles.monAutoLabel}>
                <span className={styles.monAutoDot} />
                AUTO 3s
              </span>
            </div>

            {monitorLoading && !monitorData && (
              <p className={styles.loading}>서버 정보를 불러오는 중...</p>
            )}
            {!monitorData && !monitorLoading && monitorStatus === 'error' && (
              <p className={styles.errorMsg}>서버 모니터링 데이터를 불러올 수 없습니다.</p>
            )}

            {monitorData && (() => {
              const d = monitorData;
              return (
                <>
                  {/* Row 1: 시스템 정보 + 리소스 */}
                  <div className={styles.monGrid}>
                    {/* 시스템 정보 */}
                    <div className={styles.monCard}>
                      <div className={styles.monCardTitle}>SYSTEM INFO</div>
                      {[
                        ['ENVIRONMENT', d.environment],
                        ['RUNTIME', d.instance.nodeVersion],
                        ['UPTIME', formatUptime(d.instance.uptime)],
                        ['HOSTNAME', d.instance.hostname],
                        ['INSTANCE ID', d.instance.instanceId || 'local'],
                        ['PLATFORM', `${d.instance.platform} / ${d.instance.arch}`],
                        ['OS', `${d.instance.osType} ${d.instance.osRelease}`],
                        ['PID', d.instance.processId],
                        ['CPU CORES', d.cpu.cores],
                      ].map(([k, v]) => (
                        <div key={k} className={styles.monRow}>
                          <span className={styles.monKey}>{k}</span>
                          <span className={`${styles.monVal} ${
                            k === 'ENVIRONMENT' && v === 'production' ? styles.monValGreen :
                            k === 'INSTANCE ID' && v !== 'local' ? styles.monValAccent : ''
                          }`}>{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {/* 리소스 */}
                    <div className={styles.monCard}>
                      <div className={styles.monCardTitle}>RESOURCES</div>
                      <MonBar
                        label="CPU USAGE"
                        pct={d.cpu.usage?.overall ?? null}
                        variant="cpu"
                      />
                      {d.cpu.usage?.perCore && d.cpu.usage.perCore.length > 1 && (
                        <div className={styles.monCoreGrid}>
                          {d.cpu.usage.perCore.map((pct, i) => (
                            <MonBar key={i} label={`CORE ${i}`} pct={pct} variant="cpu" />
                          ))}
                        </div>
                      )}
                      <div style={{ height: 6 }} />
                      <MonBar
                        label={`MEMORY  ${d.memory.used} MB / ${d.memory.total} MB`}
                        pct={d.memory.usagePercent}
                        variant="mem"
                      />
                      <MonBar
                        label={`HEAP  ${d.process.heapUsed} MB / ${d.process.heapTotal} MB`}
                        pct={d.process.heapUsagePercent}
                        variant="heap"
                      />
                      <div style={{ height: 4 }} />
                      {[
                        ['RSS', `${d.process.rss} MB`],
                        ['FREE MEM', `${d.memory.free} MB`],
                        ['LOAD AVG', d.cpu.loadAverage
                          ? d.cpu.loadAverage.map(l => l.toFixed(2)).join(' / ')
                          : 'N/A (Windows)'],
                      ].map(([k, v]) => (
                        <div key={k} className={styles.monRow}>
                          <span className={styles.monKey}>{k}</span>
                          <span className={styles.monVal}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 2: API 트래픽 + 메서드/상태 */}
                  <div className={styles.monGrid}>
                    {/* 트래픽 */}
                    <div className={styles.monCard}>
                      <div className={styles.monCardTitle}>API TRAFFIC</div>
                      {[
                        ['TOTAL REQUESTS', d.requests.total.toLocaleString()],
                        ['LAST 5 MIN', d.requests.last5Min.toLocaleString()],
                        ['TOTAL ERRORS', d.requests.totalErrors.toLocaleString()],
                        ['ERRORS LAST 5 MIN', d.requests.last5MinErrors.toLocaleString()],
                        ['ERROR RATE', d.requests.errorRate],
                        ['AVG RESPONSE', `${d.requests.avgResponseTime} ms`],
                        ['LAST REQUEST', d.requests.lastRequestAt
                          ? new Date(d.requests.lastRequestAt).toLocaleTimeString('ko-KR') : '—'],
                        ['LAST ERROR', d.requests.lastErrorAt
                          ? new Date(d.requests.lastErrorAt).toLocaleTimeString('ko-KR') : '—'],
                      ].map(([k, v]) => (
                        <div key={k} className={styles.monRow}>
                          <span className={styles.monKey}>{k}</span>
                          <span className={`${styles.monVal} ${
                            k === 'ERROR RATE' && parseFloat(v) > 5 ? styles.monValRed :
                            k === 'LAST ERROR' && v !== '—' ? styles.monValYellow : ''
                          }`}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* 메서드 + 상태 코드 */}
                    <div className={styles.monCard}>
                      <div className={styles.monCardTitle}>METHODS</div>
                      <div className={styles.monBadgeGrid}>
                        {['GET', 'POST', 'PATCH', 'DELETE'].map(m => (
                          <div key={m} className={styles.monBadgeItem}>
                            <span className={styles.monBadgeKey}>{m}</span>
                            <span className={styles.monBadgeVal}>
                              {(d.requests.methods[m] || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={{ height: 14 }} />
                      <div className={styles.monCardTitle}>STATUS CODES</div>
                      <div className={styles.monBadgeGrid}>
                        {[
                          ['2xx', styles.monValGreen],
                          ['3xx', styles.monValAccent],
                          ['4xx', styles.monValYellow],
                          ['5xx', styles.monValRed],
                        ].map(([k, cls]) => (
                          <div key={k} className={styles.monBadgeItem}>
                            <span className={styles.monBadgeKey}>{k}</span>
                            <span className={`${styles.monBadgeVal} ${cls}`}>
                              {(d.requests.statusGroups[k] || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: 서비스 체크 */}
                  <div className={styles.monCard} style={{ marginBottom: 14 }}>
                    <div className={styles.monCardTitle}>SERVICE CHECKS</div>
                    <div className={styles.monServiceGrid}>
                      {[
                        ['Backend API', 'ONLINE', styles.monSvcOnline],
                        ['Database', d.services.databaseProvider, styles.monSvcVal],
                        ['Storage', d.services.storageProvider, styles.monSvcVal],
                        ['Auth Secret',
                          d.services.jwtConfigured ? 'Configured' : 'Missing',
                          d.services.jwtConfigured ? styles.monSvcOk : styles.monSvcMissing],
                        ['Frontend URL',
                          d.services.frontendUrlConfigured ? 'Configured' : 'Missing',
                          d.services.frontendUrlConfigured ? styles.monSvcOk : styles.monSvcMissing],
                      ].map(([k, v, cls]) => (
                        <div key={k} className={styles.monServiceRow}>
                          <span className={styles.monKey}>{k}</span>
                          <span className={cls}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: 최근 요청 로그 */}
                  <div className={styles.monCard}>
                    <div className={styles.monCardTitle}>RECENT REQUESTS</div>
                    <div className={styles.monLogBox}>
                      {d.recentRequests.length === 0 ? (
                        <div className={styles.monLogEmpty}>-- no requests recorded --</div>
                      ) : (
                        [...d.recentRequests].reverse().map((req, i) => (
                          <div key={i} className={styles.monLogLine}>
                            <span className={styles.monLogTime}>
                              [{new Date(req.timestamp).toLocaleTimeString('ko-KR')}]
                            </span>
                            <span className={`${styles.monLogMethod} ${
                              req.method === 'GET' ? styles.monLogGet :
                              req.method === 'POST' ? styles.monLogPost :
                              req.method === 'PATCH' ? styles.monLogPatch :
                              req.method === 'DELETE' ? styles.monLogDelete :
                              styles.monLogOther
                            }`}>{req.method}</span>
                            <span className={styles.monLogPath}>{req.path}</span>
                            <span className={`${styles.monLogStatus} ${
                              req.statusCode >= 500 ? styles.monValRed :
                              req.statusCode >= 400 ? styles.monValYellow :
                              req.statusCode >= 300 ? styles.monValAccent :
                              styles.monValGreen
                            }`}>{req.statusCode}</span>
                            <span className={styles.monLogDur}>{req.durationMs}ms</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        )}

      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleteConfirming && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>음원 삭제</h3>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)} disabled={deleteConfirming}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.deleteConfirmText}>
                <strong>"{deleteTarget.title}"</strong> 트랙을 삭제하시겠습니까?
              </p>
              <p className={styles.deleteConfirmSub}>
                삭제 후에도 데이터는 보존되며 일반 사용자에게만 숨겨집니다.
              </p>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>삭제 사유 (선택)</label>
                <input
                  className={styles.modalInput}
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="삭제 이유를 입력해주세요..."
                  maxLength={200}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalDeleteBtn} onClick={handleDeleteConfirm} disabled={deleteConfirming}>
                {deleteConfirming ? '삭제 중...' : '소프트 삭제'}
              </button>
              <button className={styles.modalCancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleteConfirming}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 영구 삭제 확인 모달 */}
      {hardDeleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !hardDeleteConfirming && setHardDeleteTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>영구 삭제</h3>
              <button className={styles.modalClose} onClick={() => setHardDeleteTarget(null)} disabled={hardDeleteConfirming}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.hardDeleteWarning}>⚠️ 영구 삭제는 되돌릴 수 없습니다.</p>
              <p className={styles.deleteConfirmText}>
                <strong>"{hardDeleteTarget.title}"</strong> 트랙과 오디오·커버 파일이 완전히 삭제됩니다.
              </p>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>
                  확인을 위해 <strong>DELETE</strong> 를 입력하세요.
                </label>
                <input
                  className={styles.modalInput}
                  value={hardDeleteConfirmText}
                  onChange={e => setHardDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalHardDeleteBtn}
                onClick={handleHardDelete}
                disabled={hardDeleteConfirming || hardDeleteConfirmText !== 'DELETE'}
              >
                {hardDeleteConfirming ? '삭제 중...' : '영구 삭제'}
              </button>
              <button className={styles.modalCancelBtn} onClick={() => setHardDeleteTarget(null)} disabled={hardDeleteConfirming}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <div className={styles.modalOverlay} onClick={() => !editSaving && setEditTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>음원 정보 수정</h3>
              <button className={styles.modalClose} onClick={() => setEditTarget(null)} disabled={editSaving}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>제목</label>
                <input
                  className={styles.modalInput}
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>크리에이터</label>
                <input
                  className={styles.modalInput}
                  value={editForm.artist}
                  onChange={e => setEditForm(f => ({ ...f, artist: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>장르</label>
                <select
                  className={styles.modalSelect}
                  value={editForm.genre}
                  onChange={e => setEditForm(f => ({ ...f, genre: e.target.value }))}
                >
                  <option value="">선택 안 함</option>
                  {TRACK_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>설명</label>
                <textarea
                  className={styles.modalTextarea}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  maxLength={500}
                />
              </div>
              {editError && <p className={styles.modalError}>{editError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalSaveBtn} onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? '저장 중...' : '저장'}
              </button>
              <button className={styles.modalCancelBtn} onClick={() => setEditTarget(null)} disabled={editSaving}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
