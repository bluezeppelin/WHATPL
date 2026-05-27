import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../hooks/usePlayer';
import { getMyLikedTracks, unlikeTrack } from '../api/likes';
import { getMyFollowedArtists, unfollowArtist, getMyFollowers } from '../api/followedArtists';
import { getPlaylists } from '../api/playlists';
import { getMyRecentlyPlayed } from '../api/recentlyPlayed';
import styles from './MyPage.module.css';

const TABS = [
  { id: 'recent', label: '최근 재생' },
  { id: 'playlists', label: '플레이리스트' },
  { id: 'likes', label: '좋아요' },
  { id: 'follow', label: '구독' },
];

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='40' stroke='%237c5cfc' stroke-width='3' fill='none'/%3E%3Ccircle cx='100' cy='100' r='12' fill='%237c5cfc'/%3E%3C/svg%3E";

export default function MyMusic() {
  const { user, loading } = useAuth();
  const { playToDefault } = usePlayer();
  const { search: locationSearch } = useLocation();
  const navigate = useNavigate();

  const validTabIds = ['recent', 'playlists', 'likes', 'follow'];
  const initialTab = (() => {
    const params = new URLSearchParams(locationSearch);
    const t = params.get('tab');
    return validTabIds.includes(t) ? t : 'recent';
  })();
  const [activeTab, setActiveTab] = useState(initialTab);

  const [recentlyPlayed, setRecentlyPlayed] = useState(undefined);
  const [myPlaylists, setMyPlaylists] = useState(undefined);
  const [likedTracks, setLikedTracks] = useState(undefined);
  const [followedArtists, setFollowedArtists] = useState(undefined);
  const [myFollowers, setMyFollowers] = useState(undefined);

  useEffect(() => {
    const params = new URLSearchParams(locationSearch);
    const t = params.get('tab');
    if (validTabIds.includes(t)) setActiveTab(t);
  }, [locationSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    getMyRecentlyPlayed()
      .then(data => setRecentlyPlayed(data.tracks))
      .catch(() => setRecentlyPlayed([]));
    getMyLikedTracks()
      .then(data => setLikedTracks(data.likedTracks))
      .catch(() => setLikedTracks([]));
    getPlaylists()
      .then(data => setMyPlaylists(data.filter(p => !p.isDefault)))
      .catch(() => setMyPlaylists([]));
    getMyFollowedArtists()
      .then(data => setFollowedArtists(data.followedArtists))
      .catch(() => setFollowedArtists([]));
    if (['creator', 'admin'].includes(user.role)) {
      getMyFollowers()
        .then(data => setMyFollowers(data.followers))
        .catch(() => setMyFollowers([]));
    }
  }, [user]);

  async function handleUnfollow(artistName) {
    try {
      await unfollowArtist(artistName);
      setFollowedArtists(prev => prev.filter(f => f.artistName !== artistName));
    } catch {}
  }

  async function handleUnlike(trackId) {
    try {
      await unlikeTrack(trackId);
      setLikedTracks(prev => prev.filter(t => t.id !== trackId));
    } catch {}
  }

  function handleTabClick(tabId) {
    setActiveTab(tabId);
    const next = new URLSearchParams(locationSearch);
    if (tabId === 'recent') next.delete('tab');
    else next.set('tab', tabId);
    navigate(`/my-sound${next.toString() ? `?${next.toString()}` : ''}`, { replace: true });
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
            <p className={styles.gateDesc}>마이 사운드를 보려면 먼저 로그인해주세요.</p>
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
        <h1 className={styles.heading}>마이 사운드</h1>

        {/* 탭 네비게이션 */}
        <nav className={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 최근 재생 탭 */}
        {activeTab === 'recent' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>최근 감상한 음악을 다시 확인하세요.</p>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>최근 들은 곡</h2>
              {recentlyPlayed === undefined && (
                <p className={styles.statusLoading}>불러오는 중...</p>
              )}
              {recentlyPlayed !== undefined && recentlyPlayed.length === 0 && (
                <div className={styles.emptyState}>
                  <p className={styles.statusNone}>최근 재생 기록이 없습니다.</p>
                  <p className={styles.statusNoneSub}>음악을 재생하면 여기에 기록됩니다.</p>
                </div>
              )}
              {recentlyPlayed !== undefined && recentlyPlayed.length > 0 && (
                <ul className={styles.likedList}>
                  {recentlyPlayed.map(track => (
                    <li key={track.id} className={styles.likedItem}>
                      <img
                        src={track.coverUrl || DEFAULT_COVER}
                        alt={track.title}
                        className={styles.likedCover}
                        onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
                      />
                      <div className={styles.likedInfo}>
                        <p className={styles.likedTitle}>{track.title}</p>
                        <p className={styles.likedArtist}>
                          {track.artist}
                          {track.genre ? ` · ${track.genre}` : ''}
                        </p>
                        <p className={styles.recentPlayedAt}>
                          {new Date(track.playedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={styles.likedActions}>
                        <button
                          className={styles.likedPlayBtn}
                          onClick={() => playToDefault(track, 'recentlyPlayed')}
                          aria-label="재생"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* 플레이리스트 탭 */}
        {activeTab === 'playlists' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>나만의 재생목록을 관리하세요.</p>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>내 플레이리스트</h2>
                <Link to="/playlists" className={styles.editBtn} style={{ textDecoration: 'none' }}>전체 보기</Link>
              </div>
              {myPlaylists === undefined && (
                <p className={styles.statusLoading}>불러오는 중...</p>
              )}
              {myPlaylists !== undefined && myPlaylists.length === 0 && (
                <div className={styles.emptyState}>
                  <p className={styles.statusNone}>플레이리스트가 없습니다.</p>
                  <p className={styles.statusNoneSub}>원하는 트랙을 모아 나만의 재생목록을 만들어보세요.</p>
                </div>
              )}
              {myPlaylists !== undefined && myPlaylists.length > 0 && (
                <ul className={styles.playlistList}>
                  {myPlaylists.map(pl => (
                    <li key={pl.id}>
                      <Link to={`/playlists/${pl.id}`} className={styles.playlistItem}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)">
                          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                        </svg>
                        <span className={styles.playlistName}>{pl.name}</span>
                        <span className={styles.playlistCount}>{pl.trackCount ?? pl.trackIds?.length ?? 0}곡</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* 좋아요 탭 */}
        {activeTab === 'likes' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>좋아하는 트랙을 한곳에서 확인하세요.</p>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>좋아요한 음악</h2>
              {likedTracks === undefined && (
                <p className={styles.statusLoading}>불러오는 중...</p>
              )}
              {likedTracks !== undefined && likedTracks.length === 0 && (
                <div className={styles.emptyState}>
                  <p className={styles.statusNone}>아직 좋아요한 음악이 없습니다.</p>
                  <p className={styles.statusNoneSub}>마음에 드는 트랙에 좋아요를 눌러보세요.</p>
                </div>
              )}
              {likedTracks !== undefined && likedTracks.length > 0 && (
                <ul className={styles.likedList}>
                  {likedTracks.map(track => (
                    <li key={track.id} className={styles.likedItem}>
                      <img
                        src={track.coverUrl || DEFAULT_COVER}
                        alt={track.title}
                        className={styles.likedCover}
                        onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
                      />
                      <div className={styles.likedInfo}>
                        <p className={styles.likedTitle}>{track.title}</p>
                        <p className={styles.likedArtist}>{track.artist}{track.genre ? ` · ${track.genre}` : ''}</p>
                      </div>
                      <div className={styles.likedActions}>
                        <button
                          className={styles.likedPlayBtn}
                          onClick={() => playToDefault(track, 'likedTracks')}
                          aria-label="재생"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </button>
                        <button
                          className={styles.likedUnlikeBtn}
                          onClick={() => handleUnlike(track.id)}
                          aria-label="좋아요 취소"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* 구독 탭 */}
        {activeTab === 'follow' && (
          <section className={styles.tabContent}>
            <p className={styles.tabDesc}>구독 중인 Creator와 나를 구독하는 사용자를 확인하세요.</p>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>내가 구독한 Creator</h2>
              <p className={styles.tabDesc} style={{ marginBottom: 12 }}>좋아하는 Creator의 새로운 사운드를 계속 확인하세요.</p>
              {followedArtists === undefined && (
                <p className={styles.statusLoading}>불러오는 중...</p>
              )}
              {followedArtists !== undefined && followedArtists.length === 0 && (
                <div className={styles.emptyState}>
                  <p className={styles.statusNone}>아직 구독한 Creator가 없습니다.</p>
                  <p className={styles.statusNoneSub}>마음에 드는 Creator를 구독해보세요.</p>
                </div>
              )}
              {followedArtists !== undefined && followedArtists.length > 0 && (
                <ul className={styles.artistList}>
                  {followedArtists.map(f => (
                    <li key={f.id} className={styles.artistItem}>
                      <div className={styles.artistAvatar}>
                        {f.artistName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.artistInfo}>
                        <p className={styles.artistName}>{f.artistName}</p>
                        <p className={styles.artistFollowedAt}>
                          {new Date(f.createdAt).toLocaleDateString('ko-KR')} 구독
                        </p>
                      </div>
                      <button
                        className={styles.unfollowBtn}
                        onClick={() => handleUnfollow(f.artistName)}
                        aria-label="구독 취소"
                      >
                        구독 취소
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>나를 구독하는 사용자</h2>
              {!['creator', 'admin'].includes(user.role) ? (
                <p className={styles.statusInfoMsg}>Creator가 되면 내 사운드를 구독하는 사용자를 확인할 수 있습니다.</p>
              ) : (
                <>
                  <p className={styles.tabDesc} style={{ marginBottom: 12 }}>내 사운드를 구독하는 사용자를 확인하세요.</p>
                  {myFollowers === undefined && (
                    <p className={styles.statusLoading}>불러오는 중...</p>
                  )}
                  {myFollowers !== undefined && myFollowers.length === 0 && (
                    <div className={styles.emptyState}>
                      <p className={styles.statusNone}>아직 나를 구독하는 사용자가 없습니다.</p>
                      <p className={styles.statusNoneSub}>트랙을 업로드하고 더 많은 사용자에게 사운드를 공유해보세요.</p>
                    </div>
                  )}
                  {myFollowers !== undefined && myFollowers.length > 0 && (
                    <>
                      <p className={styles.statusInfoMsg} style={{ marginBottom: 12 }}>총 {myFollowers.length}명이 구독 중입니다.</p>
                      <ul className={styles.artistList}>
                        {myFollowers.map(f => (
                          <li key={f.id} className={styles.artistItem}>
                            <div className={styles.artistAvatar}>
                              {f.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.artistInfo}>
                              <p className={styles.artistName}>{f.name}</p>
                              <p className={styles.artistFollowedAt}>
                                {new Date(f.subscribedAt).toLocaleDateString('ko-KR')} 구독
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
