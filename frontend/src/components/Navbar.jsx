import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../hooks/usePlayer';
import { search } from '../api/search';
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import styles from './Navbar.module.css';

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231a1a2e'/%3E%3Ccircle cx='20' cy='20' r='8' stroke='%23c89f62' stroke-width='2' fill='none'/%3E%3C/svg%3E";
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231a1510'/%3E%3Ccircle cx='20' cy='14' r='7' fill='%23c89f62'/%3E%3Cellipse cx='20' cy='34' rx='13' ry='10' fill='%23c89f62'/%3E%3C/svg%3E";

export default function Navbar({ logoUrl = '' }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout, roleLabel, loading: authLoading } = useAuth();
  const { resetPlayer, playToDefault } = usePlayer();
  const [logoFailed, setLogoFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // 검색
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef(null);

  // 알림 드롭다운
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropOpen, setNotifDropOpen] = useState(false);
  const [notifItems, setNotifItems] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifDropRef = useRef(null);

  useEffect(() => { setLogoFailed(false); }, [logoUrl]);
  useEffect(() => { setAvatarFailed(false); }, [user?.profileImageUrl]);

  // unread count 60초 주기 갱신
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const data = await getUnreadCount();
        if (!cancelled) setUnreadCount(data.unreadCount ?? 0);
      } catch {}
    };
    fetchCount();
    const iv = setInterval(fetchCount, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [user]);

  // 페이지 이동 시 검색·알림 드롭다운 닫기
  useEffect(() => {
    setQuery('');
    setResults(null);
    setDropOpen(false);
    setNotifDropOpen(false);
  }, [pathname]);

  // debounce 검색
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setDropOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await search(query.trim());
        setResults(data);
        setDropOpen(true);
      } catch {
        setResults({ tracks: [], creators: [] });
        setDropOpen(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 검색 드롭다운 외부 클릭 닫기
  useEffect(() => {
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // 알림 드롭다운 외부 클릭 + ESC 닫기
  useEffect(() => {
    if (!notifDropOpen) return;
    function handleOutside(e) {
      if (notifDropRef.current && !notifDropRef.current.contains(e.target)) {
        setNotifDropOpen(false);
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') setNotifDropOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [notifDropOpen]);

  // 프로필 영역 클릭 → 알림 드롭다운 토글
  function handleToggleDrop() {
    const opening = !notifDropOpen;
    setNotifDropOpen(opening);
    if (opening) {
      setNotifLoading(true);
      getNotifications({ limit: 5 })
        .then(data => setNotifItems(data.notifications?.slice(0, 5) ?? []))
        .catch(() => setNotifItems([]))
        .finally(() => setNotifLoading(false));
    }
  }

  // 알림 항목 클릭 → 읽음 처리 + 이동
  async function handleNotifClick(notif) {
    if (!notif.isRead) {
      try {
        await markAsRead(notif.id);
        setNotifItems(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }
    setNotifDropOpen(false);
    if (notif.link) navigate(notif.link);
  }

  // 모두 읽음
  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      setNotifItems(prev => prev?.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }

  function handlePlay(track) {
    if (!user) {
      navigate('/login', { state: { message: '음악을 재생하려면 로그인이 필요합니다.' } });
      setDropOpen(false);
      return;
    }
    playToDefault(track);
    setDropOpen(false);
  }

  function handleLogout() {
    logout();
    resetPlayer();
    navigate('/');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setDropOpen(false);
    }
    if (e.key === 'Escape') setDropOpen(false);
  }

  function goToAll() {
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setDropOpen(false);
  }

  const previewTracks = results?.tracks?.slice(0, 5) ?? [];
  const previewCreators = results?.creators?.slice(0, 5) ?? [];
  const hasResults = previewTracks.length > 0 || previewCreators.length > 0;
  const showLogoImg = logoUrl && !logoFailed;
  const initial = user?.name?.charAt(0).toUpperCase() || '?';

  return (
    <nav className={styles.nav}>
      {/* 로고 */}
      <div className={styles.logoArea}>
        <Link to="/" className={styles.logo}>
          {showLogoImg ? (
            <img src={logoUrl} alt="사이트 로고" className={styles.logoImg} onError={() => setLogoFailed(true)} />
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="var(--accent)" />
              <path d="M8 18V13M11.5 18V10M15 18V14M18.5 18V11M22 18V15" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          <span>WHATPL</span>
        </Link>
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className={`${styles.adminConsolePill} ${pathname === '/admin' ? styles.adminConsolePillActive : ''}`}
          >
            관리자 콘솔
          </Link>
        )}
      </div>

      {/* 검색바 */}
      <div className={styles.searchWrap} ref={wrapRef}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="곡 또는 크리에이터 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results && setDropOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {searching && <div className={styles.searchSpinner} />}
          {query && !searching && (
            <button
              className={styles.searchClear}
              onClick={() => { setQuery(''); setResults(null); setDropOpen(false); }}
              aria-label="검색어 지우기"
            >✕</button>
          )}
        </div>

        {/* 검색 드롭다운 */}
        {dropOpen && results && (
          <div className={styles.dropdown}>
            {!hasResults ? (
              <p className={styles.dropEmpty}>검색 결과가 없습니다</p>
            ) : (
              <>
                {previewTracks.length > 0 && (
                  <div className={styles.dropSection}>
                    <p className={styles.dropSectionTitle}>곡</p>
                    {previewTracks.map(track => (
                      <div key={track.id} className={styles.dropItem}>
                        <button className={styles.dropCoverBtn} onClick={() => handlePlay(track)} aria-label={`${track.title} 재생`}>
                          <img src={track.coverUrl || DEFAULT_COVER} alt={track.title} className={styles.dropCover} onError={e => { e.currentTarget.src = DEFAULT_COVER; }} />
                          <div className={styles.dropCoverOverlay}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </button>
                        <button className={styles.dropInfo} onClick={() => { navigate(`/tracks/${track.id}`); setDropOpen(false); }}>
                          <p className={styles.dropTitle}>{track.title}</p>
                          <p className={styles.dropSub}>
                            {track.creatorName}
                            {track.genre && <span className={styles.dropGenre}>{track.genre}</span>}
                          </p>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {previewCreators.length > 0 && (
                  <div className={styles.dropSection}>
                    <p className={styles.dropSectionTitle}>크리에이터</p>
                    {previewCreators.map(creator => (
                      <button key={creator.id} className={styles.dropItem} onClick={() => navigate(`/creators/${creator.id}`)}>
                        <img src={creator.profileImageUrl || DEFAULT_AVATAR} alt={creator.creatorName} className={styles.dropAvatar} onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                        <div className={styles.dropInfo}>
                          <p className={styles.dropTitle}>{creator.creatorName}</p>
                          {creator.name && creator.name !== creator.creatorName && <p className={styles.dropSub}>{creator.name}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <button className={styles.dropViewAll} onClick={goToAll}>
              "{query}" 전체 검색 결과 보기
            </button>
          </div>
        )}
      </div>

      {/* 우측 메뉴 */}
      <div className={styles.links}>
        <Link to="/" className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}>홈</Link>
        <Link to="/explore" className={`${styles.link} ${pathname.startsWith('/explore') ? styles.active : ''}`}>음악 탐색</Link>
        <Link to="/playlists" className={`${styles.link} ${pathname.startsWith('/playlists') ? styles.active : ''}`}>플레이리스트</Link>
        {user?.role === 'creator' && (
          <Link to="/upload" className={`${styles.uploadBtn} ${pathname === '/upload' ? styles.uploadBtnActive : ''}`}>
            + 업로드
          </Link>
        )}
        {user?.role === 'user' && (
          <Link to="/upload" className={`${styles.uploadBtn} ${pathname === '/upload' ? styles.uploadBtnActive : ''}`}>
            + Creator 신청
          </Link>
        )}

        <div className={styles.authArea}>
          {authLoading ? null : user ? (
            <>
              {/* 프로필 영역 — 전체 클릭 시 알림 드롭다운 토글 */}
              <div className={styles.profileArea} ref={notifDropRef}>
                <button className={styles.profileToggle} onClick={handleToggleDrop} aria-label="알림 열기">
                  {/* 아바타 + unread 뱃지 */}
                  <div className={styles.avatarWrap}>
                    {user.profileImageUrl && !avatarFailed ? (
                      <img
                        src={user.profileImageUrl}
                        alt="프로필"
                        className={styles.navAvatar}
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <div className={styles.navAvatarInitial}>{initial}</div>
                    )}
                    {unreadCount > 0 && (
                      <span className={styles.unreadBadge}>
                        {unreadCount >= 10 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.roleTag}>{roleLabel}</span>
                </button>

                {/* 알림 드롭다운 */}
                {notifDropOpen && (
                  <div className={styles.notifDrop}>
                    {/* 헤더 */}
                    <div className={styles.notifDropHeader}>
                      <span className={styles.notifDropTitle}>알림</span>
                      <button
                        className={styles.notifDropMarkAll}
                        onClick={handleMarkAllRead}
                        disabled={!notifItems?.some(n => !n.isRead)}
                      >
                        모두 읽음
                      </button>
                    </div>

                    {/* 알림 목록 */}
                    <div className={styles.notifDropList}>
                      {notifLoading && <p className={styles.notifDropEmpty}>불러오는 중...</p>}
                      {!notifLoading && (!notifItems || notifItems.length === 0) && (
                        <p className={styles.notifDropEmpty}>알림이 없습니다.</p>
                      )}
                      {!notifLoading && notifItems?.length > 0 && notifItems.map(n => (
                        <button
                          key={n.id}
                          className={`${styles.notifDropItem} ${!n.isRead ? styles.notifDropItemUnread : ''}`}
                          onClick={() => handleNotifClick(n)}
                        >
                          {!n.isRead && <span className={styles.notifDropDot} />}
                          <div className={styles.notifDropTextWrap}>
                            <p className={styles.notifDropItemTitle}>{n.title}</p>
                            <p className={styles.notifDropItemMsg}>{n.message}</p>
                            <p className={styles.notifDropItemDate}>
                              {new Date(n.createdAt).toLocaleString('ko-KR', {
                                month: 'numeric', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* 하단 버튼 */}
                    <div className={styles.notifDropFooter}>
                      <button
                        className={`${styles.notifDropFooterBtn} ${styles.notifDropFooterBtnGhost}`}
                        onClick={() => { navigate('/notifications'); setNotifDropOpen(false); }}
                      >
                        전체 알림 보기
                      </button>
                      <button
                        className={`${styles.notifDropFooterBtn} ${styles.notifDropFooterBtnAlt}`}
                        onClick={() => { navigate('/my-sound'); setNotifDropOpen(false); }}
                      >
                        마이 사운드
                      </button>
                      <button
                        className={styles.notifDropFooterBtn}
                        onClick={() => { navigate('/mypage'); setNotifDropOpen(false); }}
                      >
                        마이페이지
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button className={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login" className={`${styles.authBtn} ${pathname === '/login' ? styles.authBtnActive : ''}`}>
                로그인
              </Link>
              <Link to="/signup" className={`${styles.authBtn} ${styles.authBtnFill} ${pathname === '/signup' ? styles.authBtnActive : ''}`}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}