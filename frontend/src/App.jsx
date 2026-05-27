import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import Navbar from './components/Navbar';
import PlayerBar from './components/PlayerBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Upload from './pages/Upload';
import TrackDetail from './pages/TrackDetail';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistDetail from './pages/PlaylistDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import MyPage from './pages/MyPage';
import FindId from './pages/FindId';
import ResetPassword from './pages/ResetPassword';
import CreatorDetail from './pages/CreatorDetail';
import SearchResults from './pages/SearchResults';
import Explore from './pages/Explore';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import Notifications from './pages/Notifications';
import MyMusic from './pages/MyMusic';
import { getSiteSettings } from './api/siteSettings';
import { applyTheme } from './utils/theme';
import appStyles from './App.module.css';

export default function App() {
  // 캐시된 로고 URL을 초기값으로 사용 → 두 번째 방문부터 깜빡임 없음
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('cachedSiteLogoUrl') || '');

  useEffect(() => {
    // 앱 시작 시 사이트 설정 로드 → CSS 변수 적용 + 로고 표시 + 캐시 갱신
    getSiteSettings()
      .then(settings => {
        if (settings?.theme) {
          applyTheme(settings.theme);
          try { localStorage.setItem('cachedSiteTheme', JSON.stringify(settings.theme)); } catch {}
        }
        const nextLogo = settings?.logoUrl || '';
        setLogoUrl(nextLogo);
        try {
          if (nextLogo) localStorage.setItem('cachedSiteLogoUrl', nextLogo);
          else localStorage.removeItem('cachedSiteLogoUrl');
        } catch {}
      })
      .catch(() => {});

    // 관리자가 설정 변경 시 실시간 반영
    function onSettingsChanged(e) {
      if (e.detail?.theme) applyTheme(e.detail.theme);
      if (e.detail?.logoUrl !== undefined) setLogoUrl(e.detail.logoUrl);
    }
    window.addEventListener('site-settings-changed', onSettingsChanged);
    return () => window.removeEventListener('site-settings-changed', onSettingsChanged);
  }, []);

  return (
    <>
      <ScrollToTop />
      <Navbar logoUrl={logoUrl} />
      <div className={appStyles.centerBackdrop} aria-hidden="true" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/tracks/:id" element={<TrackDetail />} />
        <Route path="/playlists" element={<PlaylistsPage />} />
        <Route path="/playlists/:id" element={<PlaylistDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/find-id" element={<FindId />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/creators/:creatorId" element={<CreatorDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/my-sound" element={<MyMusic />} />
        <Route path="/my-music" element={<MyMusic />} />
      </Routes>
      <Footer />
      <PlayerBar />
    </>
  );
}
