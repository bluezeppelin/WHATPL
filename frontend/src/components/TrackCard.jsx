import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../context/AuthContext';
import { likeTrack, unlikeTrack } from '../api/likes';
import { followArtist, unfollowArtist } from '../api/followedArtists';
import AddToPlaylistModal from './AddToPlaylistModal';
import styles from './TrackCard.module.css';

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='40' stroke='%23c89f62' stroke-width='3' fill='none'/%3E%3Ccircle cx='100' cy='100' r='12' fill='%23c89f62'/%3E%3C/svg%3E";

function formatDuration(sec) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function formatPlays(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function TrackCard({ track, isLiked = false, onLikeToggle, isFollowing = false, onFollowToggle }) {
  const { playToDefault, currentTrack, isPlaying } = usePlayer();
  const isCurrentlyPlaying = isPlaying && currentTrack?.id === track.id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(isLiked);
  const [likeLoading, setLikeLoading] = useState(false);
  const [following, setFollowing] = useState(isFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [addToPlOpen, setAddToPlOpen] = useState(false);

  // 부모 상태 변경 시 동기화
  useEffect(() => setLiked(isLiked), [isLiked]);
  useEffect(() => setFollowing(isFollowing), [isFollowing]);

  function handlePlay() {
    if (!user) {
      navigate('/login', { state: { message: '음악을 재생하려면 로그인이 필요합니다.' } });
      return;
    }
    playToDefault(track);
  }

  async function handleFollow(e) {
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { message: '팔로우하려면 로그인이 필요합니다.' } });
      return;
    }
    if (followLoading) return;
    setFollowLoading(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) {
        await followArtist(track.artist);
      } else {
        await unfollowArtist(track.artist);
      }
      onFollowToggle?.(track.artist, next);
    } catch {
      setFollowing(!next);
    } finally {
      setFollowLoading(false);
    }
  }

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
      onLikeToggle?.(track.id, next);
    } catch {
      setLiked(!next);
    } finally {
      setLikeLoading(false);
    }
  }

  function handleAddToPlaylist(e) {
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { message: '플레이리스트에 추가하려면 로그인이 필요합니다.' } });
      return;
    }
    setAddToPlOpen(true);
  }

  return (
    <>
    {addToPlOpen && (
      <AddToPlaylistModal track={track} onClose={() => setAddToPlOpen(false)} />
    )}
    <div className={`${styles.card} ${isCurrentlyPlaying ? styles.cardPlaying : ''}`}>
      <div className={styles.coverWrapper} onClick={handlePlay}>
        <img
          src={track.coverUrl || DEFAULT_COVER}
          alt={track.title}
          className={styles.cover}
          onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
        />
        <div className={`${styles.playOverlay} ${isCurrentlyPlaying ? styles.playOverlayActive : ''}`}>
          {isCurrentlyPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </div>

      <div className={styles.info}>
        <p className={styles.title} onClick={() => navigate(`/tracks/${track.id}`)}>{track.title}</p>
        <div className={styles.artistRow}>
          {track.uploadedByUserId ? (
            <span
              className={`${styles.artist} ${styles.artistLink}`}
              onClick={() => navigate(`/creators/${track.uploadedByUserId}`)}
            >
              {track.artist}
            </span>
          ) : (
            <p className={styles.artist}>{track.artist}</p>
          )}
          <button
            className={`${styles.followBtn} ${following ? styles.followBtnActive : ''}`}
            onClick={handleFollow}
            aria-label={following ? '구독 취소' : '구독'}
          >
            {following ? '구독 중' : '+ 구독'}
          </button>
        </div>
        {track.genre && <span className={styles.genre}>{track.genre}</span>}
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
          {formatPlays(track.plays)}
        </span>
        <span className={styles.metaItem}>{formatDuration(track.duration)}</span>

        <div className={styles.metaActions}>
          {/* 플레이리스트 추가 */}
          <button
            className={styles.metaIconBtn}
            onClick={handleAddToPlaylist}
            title="플레이리스트에 추가"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z"/>
            </svg>
          </button>

          {/* 좋아요 */}
          <button
            className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`}
            onClick={handleLike}
            aria-label={liked ? '좋아요 취소' : '좋아요'}
          >
            {liked ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
              </svg>
            )}
          </button>

          {/* 상세 페이지 */}
          <Link
            to={`/tracks/${track.id}`}
            className={styles.metaIconBtn}
            title="곡 상세 보기"
            onClick={e => e.stopPropagation()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
