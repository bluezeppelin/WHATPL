import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from './InfoPage.module.css';

export default function About() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const INTRO_CARDS = [
    { key: 'intro_card1', title: t('about.intro_card1_title') },
    { key: 'intro_card2', title: t('about.intro_card2_title') },
    { key: 'intro_card3', title: t('about.intro_card3_title') },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('about.title')}</h1>
          <p className={styles.subtitle}>{t('about.subtitle')}</p>
        </header>

        <section className={styles.section}>
          <div className={styles.introGrid}>
            {INTRO_CARDS.map(card => (
              <div key={card.key} className={styles.introCard}>
                <p className={styles.introCardTitle}>{card.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('about.member_types_title')}</h2>
          <div className={styles.memberGrid}>
            <div className={styles.memberCard}>
              <div className={styles.cardLabel}>{t('about.member_general')}</div>
            </div>
            <div className={styles.memberCard}>
              <div className={`${styles.cardLabel} ${styles.cardLabelCreator}`}>{t('about.member_creator')}</div>
            </div>
          </div>
        </section>

        <div className={styles.actions}>
          {user ? (
            <Link to="/mypage" className={styles.primaryBtn}>{t('about.button_mypage')}</Link>
          ) : (
            <Link to="/signup" className={styles.primaryBtn}>{t('about.button_signup')}</Link>
          )}
          <Link to="/explore" className={styles.secondaryBtn}>{t('about.button_explore')}</Link>
        </div>

        <div className={styles.teamSection}>
          <p className={styles.teamLabel}>{t('about.team_label')}</p>
          <p className={styles.teamName}>{t('about.team_name')}</p>
        </div>
      </div>
    </div>
  );
}
