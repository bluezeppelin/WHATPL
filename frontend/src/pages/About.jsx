import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './InfoPage.module.css';

const INTRO_CARDS = [
  {
    title: '음악을 감상하는 공간',
    desc: 'WHATPL은 사용자가 다양한 트랙을 감상하고, 좋아하는 음악을 저장할 수 있는 음악 커뮤니티 서비스입니다.',
  },
  {
    title: '음악을 업로드하는 공간',
    desc: 'Creator는 자신의 음악을 업로드하고 관리하며, 자신의 음악을 사용자들에게 소개할 수 있습니다.',
  },
  {
    title: '크리에이터를 발견하는 공간',
    desc: '사용자는 관심 있는 Creator를 팔로우하고, 새롭게 업로드되는 음악을 확인하며 더 다양한 음악을 발견할 수 있습니다.',
  },
];

export default function About() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>서비스 소개</h1>
          <p className={styles.subtitle}>WHATPL · What You Play</p>
        </header>

        {/* 소개 카드 3개 */}
        <section className={styles.section}>
          <div className={styles.introGrid}>
            {INTRO_CARDS.map(card => (
              <div key={card.title} className={styles.introCard}>
                <p className={styles.introCardTitle}>{card.title}</p>
                <p className={styles.introCardDesc}>{card.desc}</p>
              </div>
            ))}
          </div>
          <p className={styles.introClosure}>
            WHATPL은 사용자가 음악을 감상하고, Creator의 음악을 발견하며, 자신만의 음악 경험을 만들어갈 수 있는 공간을 지향합니다.
          </p>
        </section>

        {/* 회원 유형 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>회원 유형</h2>
          <div className={styles.memberGrid}>
            <div className={styles.memberCard}>
              <div className={styles.cardLabel}>일반 회원</div>
              <p className={styles.cardDesc}>
                음악 감상, 좋아요, 플레이리스트, Creator 팔로우 기능을 이용할 수 있습니다.
              </p>
            </div>
            <div className={styles.memberCard}>
              <div className={`${styles.cardLabel} ${styles.cardLabelCreator}`}>Creator</div>
              <p className={styles.cardDesc}>
                자신의 음악을 업로드하고 관리할 수 있습니다. Creator 전환은 관리자 승인 후 가능합니다.
              </p>
            </div>
          </div>
        </section>

        <div className={styles.actions}>
          {user ? (
            <Link to="/mypage" className={styles.primaryBtn}>마이페이지로 이동</Link>
          ) : (
            <Link to="/signup" className={styles.primaryBtn}>지금 가입하기</Link>
          )}
          <Link to="/explore" className={styles.secondaryBtn}>음악 탐색하기</Link>
        </div>

        <div className={styles.teamSection}>
          <p className={styles.teamLabel}>Project Team</p>
          <p className={styles.teamName}>Created by Team AWSome</p>
        </div>
      </div>
    </div>
  );
}
