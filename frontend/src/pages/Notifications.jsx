import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../api/notifications';
import styles from './MyPage.module.css';

export default function Notifications() {
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
            <h2 className={styles.gateTitle}>로그인이 필요합니다</h2>
            <p className={styles.gateDesc}>알림을 보려면 먼저 로그인해주세요.</p>
            <div className={styles.gateActions}>
              <Link to="/login" className={styles.gatePrimary}>로그인</Link>
              <Link to="/signup" className={styles.gateSecondary}>회원가입</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>알림</h1>
        <section className={styles.tabContent}>
          <p className={styles.tabDesc}>서비스 활동과 관련된 알림을 확인하세요.</p>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>알림 목록</h2>
              {notifications?.some(n => !n.isRead) && (
                <button className={styles.editBtn} onClick={handleMarkAllRead}>모두 읽음 처리</button>
              )}
            </div>
            {notifLoading && <p className={styles.statusLoading}>불러오는 중...</p>}
            {!notifLoading && notifications !== undefined && notifications.length === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.statusNone}>알림이 없습니다.</p>
                <p className={styles.statusNoneSub}>새로운 알림이 생기면 여기에 표시됩니다.</p>
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
                      aria-label={n.isRead ? undefined : '읽음 처리'}
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
                      aria-label="알림 삭제"
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
