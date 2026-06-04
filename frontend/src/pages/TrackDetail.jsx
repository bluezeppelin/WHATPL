import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const LOCALE_MAP = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' };
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
  return new Date(iso).toLocaleDateString(LOCALE_MAP[i18n.language] || 'ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPlays(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function TrackDetail() {
  const { t } = useTranslation();
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
    getTrack(id).then(setTrack).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !track) { setLiked(false); return; }
    getTrackLikeStatus(track.id).then(data => setLiked(data.liked ?? false)).catch(() => setLiked(false));
  }, [track?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLike(e) {
    e.stopPropagation();
    if (!user) { navigate('/login', { state: { message: t('trackcard.like_redirect') } }); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    const next = !liked;
    setLiked(next);
    try {
      if (next) await likeTrack(track.id);
      else await unlikeTrack(track.id);
    } catch { setLiked(!next); }
    finally { setLikeLoading(false); }
  }

  const handlePlay = () => {
    if (!track) return;
    if (!user) { navigate('/login', { state: { message: t('trackcard.play_redirect') } }); return; }
    playToDefault(track);
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
    } finally { setDeleteLoading(false); }
  };

  const closeDeleteConfirm = () => { if (deleteLoading) return; setShowDeleteConfirm(false); setDeleteError(''); };

  if (loading) return <div className={styles.centered}><div className={styles.spinner} /></div>;

  if (notFound || !track) {
    return (
      <div className={styles.centered}>
        <p className={styles.notFoundText}>{t('track.not_found')}</p>
        <button className={styles.backLink} onClick={goBack}>{t('track.back_button')}</button>
      </div>
    );
  }

  const cover = track.coverUrl || DEFAULT_COVER;

  return (
    <>
    {addToPlOpen && track && <AddToPlaylistModal track={track} onClose={() => setAddToPlOpen(false)} />}
    {editOpen && <EditTrackModal track={track} onClose={() => setEditOpen(false)} onSaved={(updated) => setTrack(updated)} />}
    {showDeleteConfirm && (
      <div className={styles.modalOverlay} onClick={closeDeleteConfirm}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <h3 className={styles.modalTitle}>{t('track.delete_modal_title')}</h3>
          <p className={styles.modalDesc}>
            "<strong>{track.title}</strong>" {t('track.delete_modal_body')}
          </p>
          {deleteError && <p className={styles.modalError}>{deleteError}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.modalCancelBtn} onClick={closeDeleteConfirm} disabled={deleteLoading}>
              {t('track.delete_modal_cancel')}
            </button>
            <button type="button" className={styles.modalConfirmBtn} onClick={handleConfirmDelete} disabled={deleteLoading}>
              {deleteLoading ? t('track.deleting') : t('track.delete_modal_confirm')}
            </button>
          </div>
        </div>
      </div>
    )}
    <main className={styles.page}>
      <div className={styles.heroBg} style={{ backgroundImage: `url(${cover})` }} />
      <div className={styles.heroBgOverlay} />

      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={goBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          {t('track.back_button')}
        </button>

        <section className={styles.hero}>
          <div className={styles.coverWrapper}>
            <img src={cover} alt={track.title} className={styles.cover} onError={e => { e.currentTarget.src = DEFAULT_COVER; }} />
          </div>

          <div className={styles.info}>
            <div className={styles.topMeta}>
              <span className={styles.typeLabel}>{t('track.info_title')}</span>
              {track.genre && <span className={styles.genreBadge}>{track.genre}</span>}
            </div>

            <h1 className={styles.title}>{track.title}</h1>
            <p className={styles.artist}>{track.artist}</p>

            <div className={styles.statsRow}>
              <span className={styles.stat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                {formatPlays(track.plays)}
              </span>
              <span className={styles.statDot}>·</span>
              <span className={styles.stat}>{formatDate(track.createdAt)}</span>
            </div>

            <div className={styles.actions}>
              <button className={styles.playBtn} onClick={handlePlay}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                {t('track.play_button')}
              </button>

              <button className={styles.iconBtn} title={t('track.add_playlist_title')} onClick={() => setAddToPlOpen(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z"/>
                </svg>
              </button>

              <button
                className={`${styles.iconBtn} ${liked ? styles.iconBtnLiked : ''}`}
                title={liked ? t('track.like_button_unlike') : t('track.like_button_like')}
                onClick={handleLike} disabled={likeLoading}
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
                  <button className={styles.iconBtn} title={t('track.edit_button_title')} onClick={() => setEditOpen(true)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button className={styles.deleteBtn} title={t('track.delete_button_title')} onClick={() => { setDeleteError(''); setShowDeleteConfirm(true); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {track.description && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('track.description_title')}</h2>
            <p className={styles.description}>{track.description}</p>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('track.info_title')}</h2>
          <div className={styles.metaTable}>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>{t('track.info_artist')}</span>
              <span className={styles.metaVal}>{track.artist}</span>
            </div>
            {track.genre && (
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>{t('track.info_genre')}</span>
                <span className={styles.metaVal}>{track.genre}</span>
              </div>
            )}
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>{t('track.info_upload_date')}</span>
              <span className={styles.metaVal}>{formatDate(track.createdAt)}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>{t('track.info_total_plays')}</span>
              <span className={styles.metaVal}>{formatPlays(track.plays)}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
