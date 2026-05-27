import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { reorderPlaylist } from '../api/playlists';
import styles from './NowPlayingPanel.module.css';

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='40' stroke='%237c5cfc' stroke-width='3' fill='none'/%3E%3Ccircle cx='100' cy='100' r='12' fill='%237c5cfc'/%3E%3C/svg%3E";

export default function NowPlayingPanel({ open, onClose }) {
  const { currentIndex, currentPlaylist, play, syncRemoveTrack, syncReorderTracks } = usePlayer();
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const { tracks, name } = currentPlaylist;

  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // 삭제 후 debounce flush: 개별 DELETE 대신 마지막 클릭 500ms 뒤에 전체 목록을 PUT 한 번으로 덮어씀
  // → 빠른 연속 삭제 시 JSON 파일 read-write 경쟁 조건 방지
  const flushTimerRef = useRef(null);
  const playlistRef = useRef(currentPlaylist);
  playlistRef.current = currentPlaylist; // 매 렌더마다 최신값 동기화

  useEffect(() => () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleRemove = (e, idx) => {
    e.stopPropagation();
    const trackId = tracks[idx]?.id;
    if (!trackId) return;
    syncRemoveTrack(currentPlaylist.id, trackId, idx); // index 기반 단일 항목 제거

    // 500ms 내 연속 삭제는 타이머 리셋, 마지막 삭제 후 한 번만 PUT
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      const pl = playlistRef.current;
      reorderPlaylist(pl.id, pl.tracks.map(t => t.id)).catch(() => {});
    }, 500);
  };

  const handleDragStart = (e, idx) => {
    e.stopPropagation();
    setDragFrom(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 드래그 중 리스트 상/하단 가장자리 근처면 자동 스크롤
  const autoScrollOnDrag = (e) => {
    const list = listRef.current;
    if (!list) return;
    const rect = list.getBoundingClientRect();
    const edgeSize = 60;
    const speed = 14;
    if (e.clientY - rect.top < edgeSize) {
      list.scrollTop -= speed;
    } else if (rect.bottom - e.clientY < edgeSize) {
      list.scrollTop += speed;
    }
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragOver) setDragOver(idx);
    autoScrollOnDrag(e);
  };

  // 항목 사이의 빈 공간/가장자리에서도 스크롤이 동작하도록 컨테이너에도 dragover 처리
  const handleListDragOver = (e) => {
    if (dragFrom === null) return;
    e.preventDefault();
    autoScrollOnDrag(e);
  };

  const handleDrop = async (e, toIdx) => {
    e.preventDefault();
    if (dragFrom === null || dragFrom === toIdx) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }

    const newTracks = [...tracks];
    const [moved] = newTracks.splice(dragFrom, 1);
    newTracks.splice(toIdx, 0, moved);

    syncReorderTracks(currentPlaylist.id, newTracks, dragFrom, toIdx);
    setDragFrom(null);
    setDragOver(null);

    reorderPlaylist(currentPlaylist.id, newTracks.map(t => t.id))
      .catch(() => alert('순서 저장에 실패했습니다.'));
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <>
      <div className={`${styles.backdrop} ${open ? styles.backdropVisible : ''}`} onClick={onClose} />

      <div ref={panelRef} className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.heading}>재생 목록</h2>
            <span className={styles.playlistName}>{name}</span>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.count}>{tracks.length}곡</span>
            <button className={styles.closeBtn} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.list} ref={listRef} onDragOver={handleListDragOver}>
          {tracks.length === 0 ? (
            <div className={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-tertiary)">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
              <p>재생 목록이 비어있습니다</p>
            </div>
          ) : (
            tracks.map((track, idx) => {
              const isActive = idx === currentIndex;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  className={`${styles.item} ${isActive ? styles.itemActive : ''} ${dragOver === idx ? styles.itemDragOver : ''} ${dragFrom === idx ? styles.itemDragging : ''}`}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={e => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => play(track, { id: currentPlaylist.id, name, tracks }, idx)}
                >
                  <span className={styles.dragHandle}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </span>

                  <span className={styles.num}>{idx + 1}</span>

                  <div className={styles.coverBtn}>
                    <img
                      src={track.coverUrl || DEFAULT_COVER}
                      alt={track.title}
                      className={styles.coverImg}
                      onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
                    />
                  </div>

                  <div className={styles.info}>
                    <p className={`${styles.title} ${isActive ? styles.titleActive : ''}`}>{track.title}</p>
                    <p className={styles.artist}>{track.artist}</p>
                  </div>

                  <button
                    className={styles.removeBtn}
                    onClick={(e) => handleRemove(e, idx)}
                    title="목록에서 제거"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
