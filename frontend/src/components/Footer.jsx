import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.brandName}>WHATPL</span>
          <span className={styles.brandSub}>· What You Play</span>
        </div>
        <p className={styles.desc}>{t('footer.description')}</p>
        <nav className={styles.links} aria-label="사이트 안내">
          <Link to="/about" className={styles.link}>{t('footer.link_about')}</Link>
          <span className={styles.sep}>|</span>
          <Link to="/terms" className={styles.link}>{t('footer.link_terms')}</Link>
          <span className={styles.sep}>|</span>
          <Link to="/privacy" className={styles.link}>{t('footer.link_privacy')}</Link>
          <span className={styles.sep}>|</span>
          <Link to="/support" className={styles.link}>{t('footer.link_support')}</Link>
        </nav>
        <p className={styles.copy}>{t('footer.copyright')}</p>
      </div>
    </footer>
  );
}
