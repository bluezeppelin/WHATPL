import { useEffect, useState, useRef } from 'react';
import { getPlaylists, addTrackToPlaylist, createPlaylist } from '../api/playlists';
import styles from './AddToPlaylistModal.module.css';

export default function AddToPlaylistModal({ track, onClose }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null); // 진행 중인 playlistId
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    getPlaylists().then(setPlaylists).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const addTo = async (playlist) => {
    setToggling(playlist.id);
    try {
      await addTrackToPlaylist(playlist.id, track.id);
      setPlaylists(prev => prev.map(p =>
        p.id !== playlist.id ? p : { ...p, trackIds: [...p.trackIds, track.id] }
      ));
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setToggling(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createPlaylist(newName.trim());
      await addTrackToPlaylist(created.id, track.id);
      setPlaylists(prev => [...prev, { ...created, trackIds: [track.id] }]);
      setNewName('');
    } catch {
      alert('생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.trackPreview}>
            {track.coverUrl && (
              <img src={track.coverUrl} alt={track.title} className={styles.trackCover} />
            )}
            <div>
              <p className={styles.trackTitle}>{track.title}</p>
              <p className={styles.trackArtist}>{track.artist}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <p className={styles.subheading}>플레이리스트에 추가</p>

        {loading ? (
          <div className={styles.loading}><div className={styles.spinner} /></div>
        ) : (
          <ul className={styles.list}>
            {playlists.map(pl => {
              const busy = toggling === pl.id;
              return (
                <li key={pl.id}>
                  <button
                    className={styles.plItem}
                    onClick={() => addTo(pl)}
                    disabled={busy}
                  >
                    <span className={styles.addIcon}>
                      {busy
                        ? <span className={styles.miniSpinner} />
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                          </svg>
                      }
                    </span>
                    <span className={styles.plName}>{pl.name}</span>
                    <span className={styles.plCount}>{pl.trackIds.length}곡</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 새 플레이리스트 만들기 */}
        <form onSubmit={handleCreate} className={styles.createRow}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="새 플레이리스트 이름..."
            className={styles.createInput}
            maxLength={50}
          />
          <button type="submit" className={styles.createBtn} disabled={creating || !newName.trim()}>
            {creating ? '...' : '만들기'}
          </button>
        </form>
      </div>
    </div>
  );
}
