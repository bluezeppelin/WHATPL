import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from './InfoPage.module.css';

export default function About() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const INTRO_CARDS = [
    { key: '1', title: t('about.intro_card1_title'), desc: t('about.intro_card1_desc') },
    { key: '2', title: t('about.intro_card2_title'), desc: t('about.intro_card2_desc') },
    { key: '3', title: t('about.intro_card3_title'), desc: t('about.intro_card3_desc') },
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
                <p className={styles.introCardDesc}>{card.desc}</p>
              </div>
            ))}
          </div>
          <p className={styles.introClosure}>{t('about.intro_closure')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('about.member_types_title')}</h2>
          <div className={styles.memberGrid}>
            <div className={styles.memberCard}>
              <div className={styles.cardLabel}>{t('about.member_general')}</div>
              <p className={styles.cardDesc}>{t('about.member_general_desc')}</p>
            </div>
            <div className={styles.memberCard}>
              <div className={`${styles.cardLabel} ${styles.cardLabelCreator}`}>{t('about.member_creator')}</div>
              <p className={styles.cardDesc}>{t('about.member_creator_desc')}</p>
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
