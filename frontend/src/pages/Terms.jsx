import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './InfoPage.module.css';

export default function Terms() {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('terms.title')}</h1>
          <p className={styles.subtitle}>{t('terms.updated')}</p>
        </header>

        <div className={styles.notice}>{t('terms.notice')}</div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.s1_title')}</h2>
          <p className={styles.body}>{t('terms.s1_body')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.s2_title')}</h2>
          <ul className={styles.list}>
            <li>{t('terms.s2_item1')}</li>
            <li>{t('terms.s2_item2')}</li>
            <li>{t('terms.s2_item3')}</li>
            <li>{t('terms.s2_item4')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.s3_title')}</h2>
          <ul className={styles.list}>
            <li>{t('terms.s3_item1')}</li>
            <li>{t('terms.s3_item2')}</li>
            <li>{t('terms.s3_item3')}</li>
            <li>{t('terms.s3_item4')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.s4_title')}</h2>
          <ul className={styles.list}>
            <li>{t('terms.s4_item1')}</li>
            <li>{t('terms.s4_item2')}</li>
            <li>{t('terms.s4_item3')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.s5_title')}</h2>
          <ul className={styles.list}>
            <li>{t('terms.s5_item1')}</li>
            <li>{t('terms.s5_item2')}</li>
            <li>{t('terms.s5_item3')}</li>
            <li>{t('terms.s5_item4')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.s6_title')}</h2>
          <p className={styles.body}>{t('terms.s6_body')}</p>
        </section>

        <div className={styles.related}>
          <Link to="/privacy" className={styles.relatedLink}>{t('terms.link_privacy')}</Link>
          <Link to="/support" className={styles.relatedLink}>{t('terms.link_support')}</Link>
        </div>
      </div>
    </div>
  );
}
