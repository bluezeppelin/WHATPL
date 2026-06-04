import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../api/notifications';
import styles from './MyPage.module.css';

export default function Notifications() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState(undefined);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNotifLoading(true);
    getNotifications({ limit: 50 })
      .then(data => setNotifications(data.notifications))
      .catch(() => setNotifications([]))
      .finally(() => setNotifLoading(false));
  }, [user]);

  async function handleMarkRead(notif) {
    if (!notif.isRead) {
      try {
        await markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      } catch {}
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  }

  async function handleDeleteNotif(id) {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  }

  if (loading) {
    return <main className={styles.page}><div className={styles.container} /></main>;
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.gateBox}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="var(--text-tertiary)">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <h2 className={styles.gateTitle}>{t('notifications.gate_login_required')}</h2>
            <p className={styles.gateDesc}>{t('notifications.gate_login_desc')}</p>
            <div className={styles.gateActions}>
              <Link to="/login" className={styles.gatePrimary}>{t('notifications.gate_login_link')}</Link>
              <Link to="/signup" className={styles.gateSecondary}>{t('notifications.gate_signup_link')}</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>{t('notifications.heading')}</h1>
        <section className={styles.tabContent}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{t('notifications.heading')}</h2>
              {notifications?.some(n => !n.isRead) && (
                <button className={styles.editBtn} onClick={handleMarkAllRead}>{t('notifications.mark_all_read')}</button>
              )}
            </div>
            {notifLoading && <p className={styles.statusLoading}>{t('notifications.loading')}</p>}
            {!notifLoading && notifications !== undefined && notifications.length === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.statusNone}>{t('notifications.empty_state')}</p>
                <p className={styles.statusNoneSub}>{t('notifications.empty_hint')}</p>
              </div>
            )}
            {!notifLoading && notifications?.length > 0 && (
              <ul className={styles.notifList}>
                {notifications.map(n => (
                  <li
                    key={n.id}
                    className={`${styles.notifItem} ${!n.isRead ? styles.notifItemUnread : ''}`}
                  >
                    <button
                      className={styles.notifContent}
                      onClick={() => handleMarkRead(n)}
                      aria-label={n.isRead ? undefined : t('notifications.read_aria')}
                    >
                      {!n.isRead && <span className={styles.notifDot} />}
                      <div className={styles.notifTextWrap}>
                        <p className={styles.notifTitle}>{n.title}</p>
                        <p className={styles.notifMsg}>{n.message}</p>
                        <p className={styles.notifDate}>
                          {new Date(n.createdAt).toLocaleString('ko-KR', {
                            month: 'numeric', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </button>
                    <button
                      className={styles.notifDeleteBtn}
                      onClick={() => handleDeleteNotif(n.id)}
                      aria-label={t('notifications.delete_aria')}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
