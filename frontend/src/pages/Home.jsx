import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTracks, getTrendingTracks, getTopLikedTracks } from '../api/tracks';
import { getCreators } from '../api/creators';
import { getMyLikedTracks } from '../api/likes';
import { getMyFollowedArtists } from '../api/followedArtists';
import { getMyRecentlyPlayed } from '../api/recentlyPlayed';
import { getSiteSettings } from '../api/siteSettings';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../hooks/usePlayer';
import TrackCard from '../components/TrackCard';
import styles from './Home.module.css';

const SIDEBAR_GENRES = ['Hip-Hop', 'R&B', 'Electronic', 'Rock/Metal', 'Indie', 'Lo-Fi', 'Acoustic', 'Jazz'];
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%231a1510'/%3E%3Ccircle cx='40' cy='30' r='14' fill='%23c89f62'/%3E%3Cellipse cx='40' cy='66' rx='24' ry='18' fill='%23c89f62'/%3E%3C/svg%3E";
const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='40' stroke='%23c89f62' stroke-width='3' fill='none'/%3E%3Ccircle cx='100' cy='100' r='12' fill='%23c89f62'/%3E%3C/svg%3E";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playToDefault } = usePlayer();

  const [tracks, setTracks] = useState([]);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [topLikedTracks, setTopLikedTracks] = useState([]);
  const [creators, setCreators] = useState(undefined);
  const [recentlyPlayed, setRecentlyPlayed] = useState(undefined);
  const [likedIds, setLikedIds] = useState(new Set());
  const [followedArtists, setFollowedArtists] = useState(new Set());
  const [heroBgUrl, setHeroBgUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteSettings()
      .then(data => setHeroBgUrl(data.heroBackgroundUrl || ''))
      .catch(() => {});
    function onSettingsChanged(e) {
      if (e.detail?.heroBackgroundUrl !== undefined) setHeroBgUrl(e.detail.heroBackgroundUrl);
    }
    window.addEventListener('site-settings-changed', onSettingsChanged);
    return () => window.removeEventListener('site-settings-changed', onSettingsChanged);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTracks(), getCreators(), getTrendingTracks('7d', 10), getTopLikedTracks(10)])
      .then(([tracksData, creatorsData, trendingData, topLikedData]) => {
        setTracks(tracksData);
        setCreators(creatorsData.creators || []);
        setTrendingTracks(trendingData.tracks || []);
        setTopLikedTracks(topLikedData.tracks || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      getMyLikedTracks()
        .then(data => setLikedIds(new Set(data.likedTracks.map(t => t.id))))
        .catch(() => setLikedIds(new Set()));
      getMyFollowedArtists()
        .then(data => setFollowedArtists(new Set(data.followedArtists.map(f => f.artistName.toLowerCase()))))
        .catch(() => setFollowedArtists(new Set()));
      getMyRecentlyPlayed()
        .then(data => setRecentlyPlayed(data.tracks || []))
        .catch(() => setRecentlyPlayed([]));
    } else {
      setLikedIds(new Set());
      setFollowedArtists(new Set());
      setRecentlyPlayed(undefined);
    }
  }, [user]);

  const newTracks = [...tracks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const cardProps = track => ({
    track,
    isLiked: likedIds.has(track.id),
    onLikeToggle: (id, liked) => setLikedIds(prev => {
      const next = new Set(prev); liked ? next.add(id) : next.delete(id); return next;
    }),
    isFollowing: followedArtists.has(track.artist?.toLowerCase()),
    onFollowToggle: (artistName, following) => setFollowedArtists(prev => {
      const next = new Set(prev); following ? next.add(artistName.toLowerCase()) : next.delete(artistName.toLowerCase()); return next;
    }),
  });

  function handleRecentPlay(track) {
    if (!user) {
      navigate('/login', { state: { message: '음악을 재생하려면 로그인이 필요합니다.' } });
      return;
    }
    playToDefault(track);
  }

  return (
    <main className={styles.page}>
      {/* 히어로 */}
      <section
        className={styles.hero}
        style={heroBgUrl ? {
          backgroundImage: `linear-gradient(90deg, rgba(5,5,18,0.94) 0%, rgba(5,5,18,0.78) 35%, rgba(5,5,18,0.35) 70%, rgba(5,5,18,0.10) 100%), url("${heroBgUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
        } : undefined}
      >
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            자유로운 음악을 <span className={styles.highlight}>발견하고</span><br />나만의 사운드를 업로드하세요
          </h1>
          <p className={styles.heroSub}>좋아하는 음악을 발견하고,<br />나만의 트랙으로 Creator가 되어보세요.</p>
        </div>
        <div className={styles.heroGlow} />
      </section>

      <div className={styles.sectionDivider} />

      {/* 70/30 레이아웃 */}
      <div className={styles.layout}>
        {/* 왼쪽 70% — 메인 콘텐츠 */}
        <div className={styles.main}>
          {loading ? (
            <>
              {[0, 1].map(i => (
                <div key={i} className={styles.section}>
                  <div className={styles.skeletonHeader} />
                  <div className={styles.skeletonRow}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className={styles.skeletonCard}>
                        <div className={styles.skeletonCover} />
                        <div className={styles.skeletonInfo}>
                          <div className={styles.skeletonTitle} />
                          <div className={styles.skeletonArtist} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : tracks.length === 0 ? (
            <div className={styles.empty}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-tertiary)">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <p>아직 트랙이 없습니다.</p>
              <a href="/upload" className={styles.emptyLink}>첫 번째 트랙 업로드하기</a>
            </div>
          ) : (
            <>
              {/* 새로 올라온 사운드 */}
              {newTracks.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeaderRow}>
                    <div>
                      <h2 className={styles.sectionTitle}>새로 올라온 사운드</h2>
                      <p className={styles.sectionDesc}>Creator들이 최근 업로드한 새로운 트랙을 만나보세요.</p>
                    </div>
                    <button className={styles.sectionMore} onClick={() => navigate('/explore?sort=new')}>
                      더보기 →
                    </button>
                  </div>
                  <div className={styles.trackRow}>
                    {newTracks.map(track => (
                      <TrackCard key={track.id} {...cardProps(track)} />
                    ))}
                  </div>
                </div>
              )}

              {/* 최근 인기 사운드 */}
              {trendingTracks.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeaderRow}>
                    <div>
                      <h2 className={styles.sectionTitle}>최근 인기 사운드</h2>
                      <p className={styles.sectionDesc}>최근 7일 동안 WHATPL에서 많이 재생된 사운드를 확인해보세요.</p>
                    </div>
                    <button className={styles.sectionMore} onClick={() => navigate('/explore?sort=plays')}>
                      더보기 →
                    </button>
                  </div>
                  <div className={styles.trackRow}>
                    {trendingTracks.map(track => (
                      <TrackCard key={track.id} {...cardProps(track)} />
                    ))}
                  </div>
                </div>
              )}

              {/* 좋아요 많은 사운드 */}
              {topLikedTracks.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeaderRow}>
                    <div>
                      <h2 className={styles.sectionTitle}>좋아요 많은 사운드</h2>
                      <p className={styles.sectionDesc}>WHATPL 회원들이 가장 많이 좋아한 사운드를 만나보세요.</p>
                    </div>
                    <button className={styles.sectionMore} onClick={() => navigate('/explore?sort=likes')}>
                      더보기 →
                    </button>
                  </div>
                  <div className={styles.trackRow}>
                    {topLikedTracks.map(track => (
                      <TrackCard key={track.id} {...cardProps(track)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 오른쪽 30% — 사이드 위젯 */}
        <aside className={styles.side}>
          {/* 인기 크리에이터 */}
          <div className={styles.widget}>
            <h3 className={styles.widgetTitle}>인기 크리에이터</h3>
            {creators === undefined ? (
              <p className={styles.widgetEmpty}>&nbsp;</p>
            ) : creators.length === 0 ? (
              <p className={styles.widgetEmpty}>등록된 크리에이터가 없습니다.</p>
            ) : (
              <ul className={styles.creatorList}>
                {creators.slice(0, 6).map(creator => (
                  <li
                    key={creator.id}
                    className={styles.creatorItem}
                    onClick={() => navigate(`/creators/${creator.id}`)}
                  >
                    <img
                      src={creator.profileImageUrl || DEFAULT_AVATAR}
                      alt={creator.artistName}
                      className={styles.creatorAvatar}
                      onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                    <div className={styles.creatorInfo}>
                      <p className={styles.creatorName}>{creator.artistName}</p>
                      <p className={styles.creatorMeta}>
                        {creator.trackCount}곡 · 구독자 {creator.subscriberCount}명
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 장르 바로가기 */}
          <div className={styles.widget}>
            <h3 className={styles.widgetTitle}>장르 바로가기</h3>
            <div className={styles.genreGrid}>
              {SIDEBAR_GENRES.map(g => (
                <button
                  key={g}
                  className={styles.genreChip}
                  onClick={() => navigate(`/explore?genre=${encodeURIComponent(g)}`)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 최근 들은 곡 */}
          <div className={styles.widget}>
            <h3 className={styles.widgetTitle}>최근 들은 곡</h3>
            {!user ? (
              <p className={styles.widgetEmpty}>로그인하면 최근 들은 곡을 볼 수 있습니다.</p>
            ) : recentlyPlayed === undefined ? (
              <p className={styles.widgetEmpty}>&nbsp;</p>
            ) : recentlyPlayed.length === 0 ? (
              <p className={styles.widgetEmpty}>최근 재생 기록이 없습니다.</p>
            ) : (
              <ul className={styles.recentList}>
                {recentlyPlayed.slice(0, 5).map(track => (
                  <li key={track.id} className={styles.recentItem}>
                    <button
                      className={styles.recentCoverBtn}
                      onClick={() => handleRecentPlay(track)}
                      aria-label={`${track.title} 재생`}
                    >
                      <img
                        src={track.coverUrl || DEFAULT_COVER}
                        alt={track.title}
                        className={styles.recentCover}
                        onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
                      />
                      <div className={styles.recentCoverOverlay}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </button>
                    <div
                      className={styles.recentInfo}
                      onClick={() => navigate(`/tracks/${track.id}`)}
                    >
                      <p className={styles.recentTitle}>{track.title}</p>
                      <p className={styles.recentArtist}>{track.artist}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
