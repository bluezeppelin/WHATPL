import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTracks, getTrendingTracks, getTopLikedTracks } from '../api/tracks';
import { getMyLikedTracks } from '../api/likes';
import { getMyFollowedArtists } from '../api/followedArtists';
import { useAuth } from '../context/AuthContext';
import TrackCard from '../components/TrackCard';
import styles from './Explore.module.css';
import { GENRES as BASE_GENRES } from '../constants/genres';

const GENRES = ['전체', ...BASE_GENRES];

const SORT_OPTIONS = [
  { value: 'new',   label: '최신순' },
  { value: 'plays', label: '최근 인기순' },
  { value: 'likes', label: '좋아요순' },
];

function sortTracks(tracks, sort, recentPlayMap, likeCountMap) {
  const arr = [...tracks];
  if (sort === 'plays') {
    return arr.sort((a, b) => {
      const ca = recentPlayMap[a.id] ?? a.plays ?? 0;
      const cb = recentPlayMap[b.id] ?? b.plays ?? 0;
      return cb - ca;
    });
  }
  if (sort === 'likes') {
    return arr.sort((a, b) => {
      const ca = likeCountMap[a.id] ?? a.likes ?? 0;
      const cb = likeCountMap[b.id] ?? b.likes ?? 0;
      return cb - ca;
    });
  }
  return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // new (default)
}

export default function Explore() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const qGenre = searchParams.get('genre') || '전체';
  const qSort  = SORT_OPTIONS.some(o => o.value === searchParams.get('sort'))
    ? searchParams.get('sort')
    : 'new';

  const [tracks, setTracks]           = useState([]);
  const [recentPlayMap, setRecentPlayMap] = useState({});
  const [likeCountMap, setLikeCountMap]   = useState({});
  const [likedIds, setLikedIds]       = useState(new Set());
  const [followedArtists, setFollowedArtists] = useState(new Set());
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // debounce 검색어
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // 트랙 목록 + 7일 재생수/좋아요 누적 카운트맵 동시 fetch
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTracks(),
      getTrendingTracks('7d', 10000),
      getTopLikedTracks(10000),
    ])
      .then(([allTracks, trendingData, topLikedData]) => {
        setTracks(allTracks);
        const rmap = {};
        for (const t of trendingData.tracks || []) rmap[t.id] = t.recentPlayCount ?? 0;
        setRecentPlayMap(rmap);
        const lmap = {};
        for (const t of topLikedData.tracks || []) lmap[t.id] = t.likeCount ?? 0;
        setLikeCountMap(lmap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 좋아요 / 팔로우 상태 fetch
  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      setFollowedArtists(new Set());
      return;
    }
    getMyLikedTracks()
      .then(data => setLikedIds(new Set(data.likedTracks.map(t => t.id))))
      .catch(() => setLikedIds(new Set()));
    getMyFollowedArtists()
      .then(data => setFollowedArtists(new Set(data.followedArtists.map(f => f.artistName.toLowerCase()))))
      .catch(() => setFollowedArtists(new Set()));
  }, [user]);

  // 장르/정렬 변경 → URL 동기화
  function setGenre(genre) {
    const next = new URLSearchParams(searchParams);
    if (genre === '전체') next.delete('genre');
    else next.set('genre', genre);
    setSearchParams(next, { replace: true });
  }

  function setSort(sort) {
    const next = new URLSearchParams(searchParams);
    if (sort === 'new') next.delete('sort');
    else next.set('sort', sort);
    setSearchParams(next, { replace: true });
  }

  // 필터 + 정렬 적용
  const filtered = sortTracks(
    tracks.filter(t => {
      const matchGenre = qGenre === '전체' || t.genre === qGenre;
      const q = debouncedSearch.toLowerCase();
      const matchSearch = !q ||
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q);
      return matchGenre && matchSearch;
    }),
    qSort,
    recentPlayMap,
    likeCountMap,
  );

  const cardProps = useCallback(track => ({
    track,
    isLiked: likedIds.has(track.id),
    onLikeToggle: (id, liked) => setLikedIds(prev => {
      const next = new Set(prev); liked ? next.add(id) : next.delete(id); return next;
    }),
    isFollowing: followedArtists.has(track.artist?.toLowerCase()),
    onFollowToggle: (artistName, following) => setFollowedArtists(prev => {
      const next = new Set(prev);
      following ? next.add(artistName.toLowerCase()) : next.delete(artistName.toLowerCase());
      return next;
    }),
  }), [likedIds, followedArtists]);

  return (
    <main className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>음악 탐색</h1>
          <p className={styles.subHeading}>원하는 곡과 크리에이터를 찾아보세요.</p>
        </div>
        {!loading && (
          <span className={styles.count}>{filtered.length}곡</span>
        )}
      </div>

      {/* 검색 */}
      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="곡 제목 또는 크리에이터 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="검색어 지우기">✕</button>
        )}
      </div>

      {/* 필터 바 */}
      <div className={styles.filterBar}>
        {/* 장르 필터 */}
        <div className={styles.genreList}>
          {GENRES.map(g => (
            <button
              key={g}
              className={`${styles.genreBtn} ${qGenre === g ? styles.genreBtnActive : ''}`}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <div className={styles.sortGroup}>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`${styles.sortBtn} ${qSort === o.value ? styles.sortBtnActive : ''}`}
              onClick={() => setSort(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-tertiary)">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <p>조건에 맞는 곡이 없습니다.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(track => (
            <TrackCard key={track.id} {...cardProps(track)} />
          ))}
        </div>
      )}
    </main>
  );
}
