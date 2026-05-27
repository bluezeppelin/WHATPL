import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { search } from '../api/search';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../hooks/usePlayer';
import styles from './SearchResults.module.css';

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='40' stroke='%23c89f62' stroke-width='3' fill='none'/%3E%3Ccircle cx='100' cy='100' r='12' fill='%23c89f62'/%3E%3C/svg%3E";
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%231a1510'/%3E%3Ccircle cx='40' cy='30' r='14' fill='%23c89f62'/%3E%3Cellipse cx='40' cy='66' rx='24' ry='18' fill='%23c89f62'/%3E%3C/svg%3E";

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';

  const { user } = useAuth();
  const { playToDefault } = usePlayer();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  function handlePlay(track) {
    if (!user) {
      navigate('/login', { state: { message: '음악을 재생하려면 로그인이 필요합니다.' } });
      return;
    }
    playToDefault(track);
  }

  useEffect(() => {
    if (!q.trim()) { setResults({ tracks: [], creators: [] }); return; }
    setLoading(true);
    search(q.trim())
      .then(setResults)
      .catch(() => setResults({ tracks: [], creators: [] }))
      .finally(() => setLoading(false));
  }, [q]);

  const total = (results?.tracks?.length ?? 0) + (results?.creators?.length ?? 0);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.heading}>
            {q ? <><span className={styles.query}>"{q}"</span> 검색 결과</> : '검색'}
          </h1>
          {!loading && results && (
            <p className={styles.count}>총 {total}개 결과</p>
          )}
        </div>

        {loading && (
          <div className={styles.spinnerWrap}>
            <div className={styles.spinner} />
          </div>
        )}

        {!loading && results && total === 0 && (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-tertiary)">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <p className={styles.emptyTitle}>검색 결과가 없습니다</p>
            <p className={styles.emptySub}>다른 검색어를 입력해보세요.</p>
          </div>
        )}

        {!loading && results && total > 0 && (
          <>
            {/* Songs 섹션 */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                곡
                {results.tracks.length > 0 && (
                  <span className={styles.sectionCount}>{results.tracks.length}</span>
                )}
              </h2>
              {results.tracks.length === 0 ? (
                <p className={styles.sectionEmpty}>검색된 곡이 없습니다.</p>
              ) : (
                <div className={styles.trackList}>
                  {results.tracks.map(track => (
                    <div key={track.id} className={styles.trackItem}>
                      <button
                        className={styles.coverBtn}
                        onClick={() => handlePlay(track)}
                        aria-label={`${track.title} 재생`}
                      >
                        <img
                          src={track.coverUrl || DEFAULT_COVER}
                          alt={track.title}
                          className={styles.trackCover}
                          onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
                        />
                        <div className={styles.coverOverlay}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </button>
                      <Link to={`/tracks/${track.id}`} className={styles.trackInfo}>
                        <p className={styles.trackTitle}>{track.title}</p>
                        <p className={styles.trackMeta}>
                          {track.creatorName}
                          {track.genre && <span className={styles.genreTag}>{track.genre}</span>}
                        </p>
                      </Link>
                      <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Creators 섹션 */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                크리에이터
                {results.creators.length > 0 && (
                  <span className={styles.sectionCount}>{results.creators.length}</span>
                )}
              </h2>
              {results.creators.length === 0 ? (
                <p className={styles.sectionEmpty}>검색된 크리에이터가 없습니다.</p>
              ) : (
                <div className={styles.creatorList}>
                  {results.creators.map(creator => (
                    <Link
                      key={creator.id}
                      to={`/creators/${creator.id}`}
                      className={styles.creatorItem}
                    >
                      <img
                        src={creator.profileImageUrl || DEFAULT_AVATAR}
                        alt={creator.creatorName}
                        className={styles.creatorAvatar}
                        onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                      <div className={styles.creatorInfo}>
                        <p className={styles.creatorName}>{creator.creatorName}</p>
                        {creator.name && creator.name !== creator.creatorName && (
                          <p className={styles.creatorRealName}>{creator.name}</p>
                        )}
                      </div>
                      <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
