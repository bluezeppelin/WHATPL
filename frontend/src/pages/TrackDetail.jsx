import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrack } from '../api/tracks';
import { deleteAdminTrack } from '../api/adminTracks';
import { getTrackLikeStatus, likeTrack, unlikeTrack } from '../api/likes';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../context/AuthContext';
import EditTrackModal from '../components/EditTrackModal';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import styles from './TrackDetail.module.css';

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%231a1a2e'/%3E%3Ccircle cx='200' cy='200' r='80' stroke='%237c5cfc' stroke-width='4' fill='none'/%3E%3Ccircle cx='200' cy='200' r='24' fill='%237c5cfc'/%3E%3C/svg%3E";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPlays(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function TrackDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playToDefault, removeTrackById } = usePlayer();
  const { user } = useAuth();

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addToPlOpen, setAddToPlOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getTrack(id)
      .then(setTrack)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // 트랙 또는 로그인 상태 변경 시 좋아요 상태 동기화
  useEffect(() => {
    if (!user || !track) { setLiked(false); return; }
    getTrackLikeStatus(track.id)
      .then(data => setLiked(data.liked ?? false))
      .catch(() => setLiked(false));
  }, [track?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLike(e) {
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { message: '좋아요를 하려면 로그인이 필요합니다.' } });
      return;
    }
    if (likeLoading) return;
    setLikeLoading(true);
    const next = !liked;
    setLiked(next);
    try {
      if (next) {
        await likeTrack(track.id);
      } else {
        await unlikeTrack(track.id);
      }
    } catch {
      setLiked(!next);
    } finally {
      setLikeLoading(false);
    }
  }

  const handlePlay = () => {
    if (!track) return;
    if (!user) {
      navigate('/login', { state: { message: '음악을 재생하려면 로그인이 필요합니다.' } });
      return;
    }
    playToDefault(track);
  };

  const handleDelete = () => {
    setDeleteError('');
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteAdminTrack(track.id, '관리자 직접 삭제 (TrackDetail)');
      removeTrackById(track.id);
      setShowDeleteConfirm(false);
      goBack();
    } catch (err) {
      setDeleteError(err.message || '삭제에 실패했습니다.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setShowDeleteConfirm(false);
    setDeleteError('');
  };

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (notFound || !track) {
    return (
      <div className={styles.centered}>
        <p className={styles.notFoundText}>트랙을 찾을 수 없습니다.</p>
        <button className={styles.backLink} onClick={goBack}>← 돌아가기</button>
      </div>
    );
  }

  const cover = track.coverUrl || DEFAULT_COVER;

  return (
    <>
    {addToPlOpen && track && (
      <AddToPlaylistModal track={track} onClose={() => setAddToPlOpen(false)} />
    )}
    {editOpen && (
      <EditTrackModal
        track={track}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => setTrack(updated)}
      />
    )}
    {showDeleteConfirm && (
      <div className={styles.modalOverlay} onClick={closeDeleteConfirm}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <h3 className={styles.modalTitle}>트랙을 삭제할까요?</h3>
          <p className={styles.modalDesc}>
            "<strong>{track.title}</strong>"을(를) 삭제 처리합니다.<br />
            삭제된 트랙은 관리자 콘솔에서 복구하거나 영구 삭제할 수 있습니다.
          </p>
          {deleteError && <p className={styles.modalError}>{deleteError}</p>}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={closeDeleteConfirm}
              disabled={deleteLoading}
            >
              취소
            </button>
            <button
              type="button"
              className={styles.modalConfirmBtn}
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>
    )}
    <main className={styles.page}>
      {/* 배경 블러 */}
      <div className={styles.heroBg} style={{ backgroundImage: `url(${cover})` }} />
      <div className={styles.heroBgOverlay} />

      <div className={styles.inner}>
        {/* 뒤로가기 */}
        <button className={styles.backBtn} onClick={goBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          뒤로
        </button>

        {/* 히어로 섹션 */}
        <section className={styles.hero}>
          <div className={styles.coverWrapper}>
            <img
              src={cover}
              alt={track.title}
              className={styles.cover}
              onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
            />
          </div>

          <div className={styles.info}>
            <div className={styles.topMeta}>
              <span className={styles.typeLabel}>트랙</span>
              {track.genre && <span className={styles.genreBadge}>{track.genre}</span>}
            </div>

            <h1 className={styles.title}>{track.title}</h1>
            <p className={styles.artist}>{track.artist}</p>

            <div className={styles.statsRow}>
              <span className={styles.stat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                재생 {formatPlays(track.plays)}회
              </span>
              <span className={styles.statDot}>·</span>
              <span className={styles.stat}>{formatDate(track.createdAt)}</span>
            </div>

            {/* 액션 버튼 */}
            <div className={styles.actions}>
              <button className={styles.playBtn} onClick={handlePlay}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                재생
              </button>

              <button className={styles.iconBtn} title="플레이리스트에 추가" onClick={() => setAddToPlOpen(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z"/>
                </svg>
              </button>

              <button
                className={`${styles.iconBtn} ${liked ? styles.iconBtnLiked : ''}`}
                title={liked ? '좋아요 취소' : '좋아요'}
                onClick={handleLike}
                disabled={likeLoading}
              >
                {liked ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
                  </svg>
                )}
              </button>

{(user?.id === track.uploadedByUserId || user?.role === 'admin') && (
                <>
                  <button className={styles.iconBtn} title="수정" onClick={() => setEditOpen(true)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button className={styles.deleteBtn} title="삭제" onClick={handleDelete}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </>
              )}

            </div>
          </div>
        </section>

        {/* 설명 */}
        {track.description && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>설명</h2>
            <p className={styles.description}>{track.description}</p>
          </section>
        )}

        {/* 트랙 정보 테이블 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>트랙 정보</h2>
          <div className={styles.metaTable}>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>크리에이터</span>
              <span className={styles.metaVal}>{track.artist}</span>
            </div>
            {track.genre && (
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>장르</span>
                <span className={styles.metaVal}>{track.genre}</span>
              </div>
            )}
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>업로드</span>
              <span className={styles.metaVal}>{formatDate(track.createdAt)}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>총 재생</span>
              <span className={styles.metaVal}>{formatPlays(track.plays)}회</span>
            </div>
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
