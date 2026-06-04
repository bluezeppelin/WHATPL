import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getCreatorProfile } from '../api/creators';
import { followArtist, unfollowArtist } from '../api/followedArtists';
import { getMyLikedTracks } from '../api/likes';
import TrackCard from '../components/TrackCard';
import styles from './CreatorDetail.module.css';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%231a1510'/%3E%3Ccircle cx='60' cy='46' r='22' fill='%23c89f62'/%3E%3Cellipse cx='60' cy='100' rx='36' ry='28' fill='%23c89f62'/%3E%3C/svg%3E";

export default function CreatorDetail() {
  const { t } = useTranslation();
  const { creatorId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [creator, setCreator] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [likedIds, setLikedIds] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    setError('');
    getCreatorProfile(creatorId)
      .then(data => {
        setCreator(data.creator);
        setTracks(data.tracks);
        setIsSubscribed(data.isSubscribed ?? false);
        setSubscriberCount(data.creator.subscriberCount);
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setError(t('creator.not_found'));
        } else {
          setError(t('creator.load_error'));
        }
      })
      .finally(() => setLoading(false));
  }, [creatorId]);

  useEffect(() => {
    if (!user) { setLikedIds(new Set()); return; }
    getMyLikedTracks()
      .then(data => setLikedIds(new Set(data.likedTracks.map(tr => tr.id))))
      .catch(() => setLikedIds(new Set()));
  }, [user]);

  async function handleSubscribeToggle() {
    if (!user) {
      navigate('/login', { state: { message: t('creator.subscribe_redirect') } });
      return;
    }
    if (followLoading || !creator?.artistName) return;
    setFollowLoading(true);
    const next = !isSubscribed;
    setIsSubscribed(next);
    setSubscriberCount(c => next ? c + 1 : Math.max(0, c - 1));
    try {
      if (next) {
        await followArtist(creator.artistName);
      } else {
        await unfollowArtist(creator.artistName);
      }
    } catch {
      setIsSubscribed(!next);
      setSubscriberCount(c => next ? Math.max(0, c - 1) : c + 1);
    } finally {
      setFollowLoading(false);
    }
  }

  const isSelf = user && creator && user.id === creator.id;

  const cardProps = (track) => ({
    track,
    isLiked: likedIds.has(track.id),
    onLikeToggle: (id, liked) => setLikedIds(prev => {
      const next = new Set(prev);
      liked ? next.add(id) : next.delete(id);
      return next;
    }),
    isFollowing: isSubscribed,
    onFollowToggle: (_artistName, following) => {
      setIsSubscribed(following);
      setSubscriberCount(c => following ? c + 1 : Math.max(0, c - 1));
    },
  });

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeletonHeader} />
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorBox}>
            <p className={styles.errorText}>{error}</p>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>{t('creator.back_button')}</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.header}>
          <div className={styles.avatarWrap}>
            <img
              src={creator.profileImageUrl || DEFAULT_AVATAR}
              alt={creator.artistName}
              className={styles.avatar}
              onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
          </div>

          <div className={styles.headerInfo}>
            <p className={styles.profileLabel}>Creator Profile</p>
            <h1 className={styles.artistName}>{creator.artistName}</h1>
            <div className={styles.stats}>
              <span className={styles.stat}>{t('creator.subscribe_button')} <strong>{subscriberCount.toLocaleString()}</strong></span>
              <span className={styles.statDivider}>·</span>
              <span className={styles.stat}><strong>{creator.trackCount}</strong></span>
            </div>

            {!isSelf && (
              <button
                className={`${styles.subscribeBtn} ${isSubscribed ? styles.subscribeBtnActive : ''}`}
                onClick={handleSubscribeToggle}
                disabled={followLoading}
              >
                {isSubscribed ? t('creator.unsubscribe_button') : t('creator.subscribe_button')}
              </button>
            )}
          </div>
        </section>

        <section className={styles.tracksSection}>
          <h2 className={styles.sectionTitle}>Uploaded Tracks</h2>

          {tracks.length === 0 ? (
            <div className={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-tertiary)">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <p>{t('creator.empty_state')}</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {tracks.map(track => (
                <TrackCard key={track.id} {...cardProps(track)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
