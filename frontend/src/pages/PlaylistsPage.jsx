import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlaylists, createPlaylist } from '../api/playlists';
import { useAuth } from '../context/AuthContext';
import styles from './PlaylistsPage.module.css';

const TRACK_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Cpath d='M80 130V90l50 20-50 20z' fill='%23555'/%3E%3C/svg%3E";

function DefaultPlaylistIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={className}>
      <rect width="200" height="200" fill="#1a1a2e"/>
      <rect x="50" y="72" width="100" height="8" rx="4" fill="var(--accent)"/>
      <rect x="50" y="96" width="75" height="8" rx="4" fill="var(--accent)" opacity="0.7"/>
      <rect x="50" y="120" width="85" height="8" rx="4" fill="var(--accent)" opacity="0.45"/>
    </svg>
  );
}

function PlaylistCover({ covers }) {
  if (covers.length >= 4) {
    return (
      <div className={styles.mosaic}>
        {covers.slice(0, 4).map((url, i) => (
          <img key={i} src={url} alt="" className={styles.mosaicImg}
            onError={e => { e.currentTarget.src = TRACK_FALLBACK; }} />
        ))}
      </div>
    );
  }
  if (!covers[0]) {
    return <DefaultPlaylistIcon className={styles.singleCover} />;
  }
  return (
    <img
      src={covers[0]}
      alt=""
      className={styles.singleCover}
      onError={e => { e.currentTarget.src = TRACK_FALLBACK; }}
    />
  );
}

export default function PlaylistsPage() {
  const { user, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    getPlaylists().then(setPlaylists).finally(() => setLoading(false));
  };

  useEffect(() => { if (user) load(); else setLoading(false); }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createPlaylist(newName.trim());
      setPlaylists(prev => [...prev, { ...created, trackCount: 0, covers: [] }]);
      setNewName('');
    } catch {
      alert('생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) return <main className={styles.page} />;

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.gateBox}>
          <h2 className={styles.gateTitle}>로그인이 필요합니다</h2>
          <p className={styles.gateDesc}>플레이리스트 기능을 사용하려면 로그인해주세요.</p>
          <div className={styles.gateActions}>
            <Link to="/login" className={styles.gatePrimary}>로그인</Link>
            <Link to="/signup" className={styles.gateSecondary}>회원가입</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.headingWrap}>
          <h1 className={styles.heading}>플레이리스트</h1>
          <p className={styles.subHeading}>나만의 재생목록을 만들고 관리하세요.</p>
        </div>
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="새 플레이리스트 이름..."
            className={styles.createInput}
            maxLength={50}
          />
          <button type="submit" className={styles.createBtn} disabled={creating || !newName.trim()}>
            + 만들기
          </button>
        </form>
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : playlists.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>아직 만든 플레이리스트가 없습니다.</p>
          <p className={styles.emptySub}>첫 번째 플레이리스트를 만들어보세요.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {playlists.map(pl => (
            <Link key={pl.id} to={`/playlists/${pl.id}`} className={styles.card}>
              <div className={styles.coverArea}>
                <PlaylistCover covers={pl.covers} />
                {pl.isDefault && <span className={styles.defaultBadge}>기본</span>}
              </div>
              <p className={styles.cardName}>{pl.name}</p>
              <p className={styles.cardCount}>{pl.trackCount}곡</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
