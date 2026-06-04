import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../hooks/usePlayer';
import { search } from '../api/search';
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import styles from './Navbar.module.css';

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231a1a2e'/%3E%3Ccircle cx='20' cy='20' r='8' stroke='%23c89f62' stroke-width='2' fill='none'/%3E%3C/svg%3E";
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231a1510'/%3E%3Ccircle cx='20' cy='14' r='7' fill='%23c89f62'/%3E%3Cellipse cx='20' cy='34' rx='13' ry='10' fill='%23c89f62'/%3E%3C/svg%3E";

export default function Navbar({ logoUrl = '' }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout, roleLabel, loading: authLoading } = useAuth();
  const { resetPlayer, playToDefault } = usePlayer();
  const [logoFailed, setLogoFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropOpen, setNotifDropOpen] = useState(false);
  const [notifItems, setNotifItems] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifDropRef = useRef(null);

  const [langDropOpen, setLangDropOpen] = useState(false);
  const langDropRef = useRef(null);
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('whatpl_language') || 'ko');

  useEffect(() => { setLogoFailed(false); }, [logoUrl]);
  useEffect(() => { setAvatarFailed(false); }, [user?.profileImageUrl]);

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

  useEffect(() => {
    setQuery('');
    setResults(null);
    setDropOpen(false);
    setNotifDropOpen(false);
  }, [pathname]);

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

  useEffect(() => {
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

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

  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      setNotifItems(prev => prev?.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }

  function handlePlay(track) {
    if (!user) {
      navigate('/login', { state: { message: t('trackcard.play_redirect') } });
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

  function handleLangChange(lang) {
    i18n.changeLanguage(lang);
    localStorage.setItem('whatpl_language', lang);
    setCurrentLang(lang);
    setLangDropOpen(false);
  }

  useEffect(() => {
    if (!langDropOpen) return;
    function handleOutside(e) {
      if (langDropRef.current && !langDropRef.current.contains(e.target)) setLangDropOpen(false);
    }
    function handleEsc(e) { if (e.key === 'Escape') setLangDropOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [langDropOpen]);

  const LANG_FLAGS = { ko: '/flags/ko.svg', en: '/flags/en.svg', ja: '/flags/ja.svg' };
  const LANG_LABELS = { ko: '한국어', en: 'English', ja: '日本語' };

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
            {t('navbar.admin_console')}
          </Link>
        )}
      </div>

      <div className={styles.searchWrap} ref={wrapRef}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder={t('navbar.search_placeholder')}
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
              aria-label={t('navbar.search_clear_aria')}
            >✕</button>
          )}
        </div>

        {dropOpen && results && (
          <div className={styles.dropdown}>
            {!hasResults ? (
              <p className={styles.dropEmpty}>{t('navbar.search_no_results')}</p>
            ) : (
              <>
                {previewTracks.length > 0 && (
                  <div className={styles.dropSection}>
                    <p className={styles.dropSectionTitle}>{t('navbar.search_songs_section')}</p>
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
                    <p className={styles.dropSectionTitle}>{t('navbar.search_creators_section')}</p>
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
              "{query}" {t('navbar.search_view_all')}
            </button>
          </div>
        )}
      </div>

      <div className={styles.links}>
        <Link to="/" className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}>{t('navbar.nav_home')}</Link>
        <Link to="/explore" className={`${styles.link} ${pathname.startsWith('/explore') ? styles.active : ''}`}>{t('navbar.nav_explore')}</Link>
        <Link to="/playlists" className={`${styles.link} ${pathname.startsWith('/playlists') ? styles.active : ''}`}>{t('navbar.nav_playlists')}</Link>
        {user?.role === 'creator' && (
          <Link to="/upload" className={`${styles.uploadBtn} ${pathname === '/upload' ? styles.uploadBtnActive : ''}`}>
            {t('navbar.nav_upload')}
          </Link>
        )}
        {user?.role === 'user' && (
          <Link to="/upload" className={`${styles.uploadBtn} ${pathname === '/upload' ? styles.uploadBtnActive : ''}`}>
            {t('navbar.nav_creator_request')}
          </Link>
        )}

        {/* 언어 선택 — 플레이리스트와 프로필 사이 */}
        <div className={styles.langPicker} ref={langDropRef}>
          <button
            className={`${styles.langFlagBtn} ${langDropOpen ? styles.langFlagBtnOpen : ''}`}
            onClick={() => setLangDropOpen(o => !o)}
            aria-label="언어 선택"
          >
            <img src={LANG_FLAGS[currentLang]} alt={currentLang} className={styles.langFlagImg} />
          </button>
          {langDropOpen && (
            <div className={styles.langDrop}>
              {['ko', 'en', 'ja'].map(lang => (
                <button
                  key={lang}
                  className={`${styles.langDropItem} ${currentLang === lang ? styles.langDropItemActive : ''}`}
                  onClick={() => handleLangChange(lang)}
                >
                  <img src={LANG_FLAGS[lang]} alt={lang} className={styles.langDropFlagImg} />
                  <span className={styles.langDropLabel}>{LANG_LABELS[lang]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.authArea}>
          {authLoading ? null : user ? (
            <>
              <div className={styles.profileArea} ref={notifDropRef}>
                <button className={styles.profileToggle} onClick={handleToggleDrop} aria-label={t('navbar.notifications_title')}>
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
                  <span className={styles.roleTag}>
                    {{ user: t('admin.members_filter_user'), creator: t('admin.members_filter_creator'), admin: t('admin.members_filter_admin') }[user.role] ?? roleLabel}
                  </span>
                </button>

                {notifDropOpen && (
                  <div className={styles.notifDrop}>
                    <div className={styles.notifDropHeader}>
                      <span className={styles.notifDropTitle}>{t('navbar.notifications_title')}</span>
                      <button
                        className={styles.notifDropMarkAll}
                        onClick={handleMarkAllRead}
                        disabled={!notifItems?.some(n => !n.isRead)}
                      >
                        {t('navbar.notifications_mark_all')}
                      </button>
                    </div>

                    <div className={styles.notifDropList}>
                      {notifLoading && <p className={styles.notifDropEmpty}>{t('navbar.notification_loading')}</p>}
                      {!notifLoading && (!notifItems || notifItems.length === 0) && (
                        <p className={styles.notifDropEmpty}>{t('navbar.notifications_empty')}</p>
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

                    <div className={styles.notifDropFooter}>
                      <button
                        className={`${styles.notifDropFooterBtn} ${styles.notifDropFooterBtnGhost}`}
                        onClick={() => { navigate('/notifications'); setNotifDropOpen(false); }}
                      >
                        {t('navbar.notifications_view_all')}
                      </button>
                      <button
                        className={`${styles.notifDropFooterBtn} ${styles.notifDropFooterBtnAlt}`}
                        onClick={() => { navigate('/my-sound'); setNotifDropOpen(false); }}
                      >
                        {t('navbar.my_sound')}
                      </button>
                      <button
                        className={styles.notifDropFooterBtn}
                        onClick={() => { navigate('/mypage'); setNotifDropOpen(false); }}
                      >
                        {t('navbar.my_page')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button className={styles.logoutBtn} onClick={handleLogout}>{t('navbar.nav_logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className={`${styles.authBtn} ${pathname === '/login' ? styles.authBtnActive : ''}`}>
                {t('navbar.nav_login')}
              </Link>
              <Link to="/signup" className={`${styles.authBtn} ${styles.authBtnFill} ${pathname === '/signup' ? styles.authBtnActive : ''}`}>
                {t('navbar.nav_signup')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
