import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPlaylist, renamePlaylist, deletePlaylist, reorderPlaylist } from '../api/playlists';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../context/AuthContext';
import styles from './PlaylistDetail.module.css';

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Crect x='50' y='72' width='100' height='8' rx='4' fill='%237c5cfc'/%3E%3Crect x='50' y='96' width='75' height='8' rx='4' fill='%237c5cfc' opacity='0.7'/%3E%3Crect x='50' y='120' width='85' height='8' rx='4' fill='%237c5cfc' opacity='0.45'/%3E%3C/svg%3E";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadPlaylist, play, syncRemoveTrack, syncReorderTracks } = usePlayer();
  const { user } = useAuth();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const nameRef = useRef(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // 삭제 debounce flush
  const flushTimerRef = useRef(null);
  const playlistRef = useRef(null);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); }, []);

  const load = () => {
    setLoading(true);
    getPlaylist(id)
      .then(data => { setPlaylist(data); setNameInput(data.name); })
      .catch(() => navigate('/playlists'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (editingName) nameRef.current?.focus();
  }, [editingName]);

  const handlePlayAll = () => {
    if (!playlist?.tracks?.length) return;
    if (!user) {
      navigate('/login', { state: { message: '음악을 재생하려면 로그인이 필요합니다.' } });
      return;
    }
    loadPlaylist(playlist, playlist.tracks);
  };

  const handleRename = async () => {
    if (!nameInput.trim() || nameInput === playlist.name) {
      setEditingName(false);
      return;
    }
    try {
      const updated = await renamePlaylist(id, nameInput.trim());
      setPlaylist(prev => ({ ...prev, name: updated.name }));
    } catch {
      alert('이름 변경에 실패했습니다.');
    } finally {
      setEditingName(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`"${playlist.name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await deletePlaylist(id);
      navigate('/playlists');
    } catch (err) {
      alert(err.response?.data?.error || '삭제할 수 없습니다.');
    }
  };

  const handleRemoveTrack = (index) => {
    const trackId = playlist.tracks[index]?.id;
    if (!trackId) return;
    // 즉시 UI 반영
    setPlaylist(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.filter((_, i) => i !== index),
        trackIds: prev.trackIds.filter((_, i) => i !== index),
      };
      playlistRef.current = next; // flush가 최신 상태를 읽도록 즉시 동기화
      return next;
    });
    syncRemoveTrack(id, trackId, index);

    // 500ms 내 연속 삭제는 타이머 리셋, 마지막 삭제 후 한 번만 PUT
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      const pl = playlistRef.current;
      if (pl) reorderPlaylist(pl.id, pl.trackIds).catch(() => {});
    }, 500);
  };

  const handleDragStart = (e, idx) => {
    setDragFrom(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragOver) setDragOver(idx);
  };

  const handleDrop = async (e, toIdx) => {
    e.preventDefault();
    if (dragFrom === null || dragFrom === toIdx) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }
    const newTracks = [...playlist.tracks];
    const [moved] = newTracks.splice(dragFrom, 1);
    newTracks.splice(toIdx, 0, moved);

    setPlaylist(prev => ({ ...prev, tracks: newTracks, trackIds: newTracks.map(t => t.id) }));
    syncReorderTracks(id, newTracks, dragFrom, toIdx);
    setDragFrom(null);
    setDragOver(null);

    reorderPlaylist(id, newTracks.map(t => t.id)).catch(() => alert('순서 저장에 실패했습니다.'));
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  if (loading) {
    return (
      <div className={styles.centered}><div className={styles.spinner} /></div>
    );
  }

  if (!playlist) return null;

  const realCoverUrl = playlist.tracks?.[0]?.coverUrl || null;

  return (
    <main className={styles.page}>
      <div className={styles.heroBg} style={realCoverUrl ? { backgroundImage: `url(${realCoverUrl})` } : undefined} />
      <div className={styles.heroBgOverlay} />

      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={() => navigate('/playlists')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          플레이리스트
        </button>

        {/* 헤더 */}
        <section className={styles.hero}>
          <div className={styles.coverBox}>
            {realCoverUrl ? (
              <img
                src={realCoverUrl}
                alt={playlist.name}
                className={styles.cover}
                onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={styles.cover}>
                <rect width="200" height="200" fill="#1a1a2e"/>
                <rect x="50" y="72" width="100" height="8" rx="4" fill="var(--accent)"/>
                <rect x="50" y="96" width="75" height="8" rx="4" fill="var(--accent)" opacity="0.7"/>
                <rect x="50" y="120" width="85" height="8" rx="4" fill="var(--accent)" opacity="0.45"/>
              </svg>
            )}
            {playlist.isDefault && <span className={styles.defaultBadge}>기본 재생목록</span>}
          </div>

          <div className={styles.info}>
            <span className={styles.typeLabel}>플레이리스트</span>

            {editingName ? (
              <input
                ref={nameRef}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={handleRename}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                className={styles.nameInput}
                maxLength={50}
              />
            ) : (
              <h1
                className={`${styles.name} ${!playlist.isDefault ? styles.nameEditable : ''}`}
                onClick={() => !playlist.isDefault && setEditingName(true)}
                title={!playlist.isDefault ? '클릭하여 이름 변경' : ''}
              >
                {playlist.name}
                {!playlist.isDefault && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={styles.editIcon}>
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                )}
              </h1>
            )}

            <p className={styles.meta}>{playlist.tracks.length}곡 · {formatDate(playlist.createdAt)}</p>

            <div className={styles.actions}>
              <button
                className={styles.playAllBtn}
                onClick={handlePlayAll}
                disabled={!playlist.tracks.length}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                모두 재생
              </button>

              {!playlist.isDefault && (
                <button className={styles.deleteBtn} onClick={handleDelete} title="플레이리스트 삭제">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 트랙 목록 */}
        <section className={styles.tracks}>
          {playlist.tracks.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>아직 이 플레이리스트에 트랙이 없습니다.</p>
              <p className={styles.emptySub}>음악을 추가해 재생목록을 채워보세요.</p>
              <Link to="/" className={styles.emptyLink}>음악 둘러보기 →</Link>
            </div>
          ) : (
            playlist.tracks.map((track, idx) => {
              return (
                <div
                  key={`${track.id}-${idx}`}
                  className={`${styles.row} ${dragOver === idx ? styles.rowDragOver : ''} ${dragFrom === idx ? styles.rowDragging : ''}`}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={e => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  <span className={styles.dragHandle}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </span>
                  <span className={styles.rowNum}>{idx + 1}</span>
                  <button className={styles.rowCover} onClick={() => {
                    if (!user) {
                      navigate('/login', { state: { message: '음악을 재생하려면 로그인이 필요합니다.' } });
                      return;
                    }
                    play(track, { id: playlist.id, name: playlist.name, tracks: playlist.tracks }, idx);
                  }}>
                    <img
                      src={track.coverUrl || DEFAULT_COVER}
                      alt={track.title}
                      className={styles.rowImg}
                      onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
                    />
                  </button>
                  <div className={styles.rowInfo}>
                    <p className={styles.rowTitle}>{track.title}</p>
                    <p className={styles.rowArtist}>{track.artist}</p>
                  </div>
                  {track.genre && <span className={styles.rowGenre}>{track.genre}</span>}
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveTrack(idx)}
                    title="목록에서 제거"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
