import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.brandName}>WHATPL</span>
          <span className={styles.brandSub}>· What You Play</span>
        </div>
        <p className={styles.desc}>
          음악을 업로드하고, 감상하며, 새로운 크리에이터를 발견할 수 있는 음악 커뮤니티입니다.
        </p>
        <nav className={styles.links} aria-label="사이트 안내">
          <Link to="/about" className={styles.link}>서비스 소개</Link>
          <span className={styles.sep}>|</span>
          <Link to="/terms" className={styles.link}>이용약관</Link>
          <span className={styles.sep}>|</span>
          <Link to="/privacy" className={styles.link}>개인정보처리방침</Link>
          <span className={styles.sep}>|</span>
          <Link to="/support" className={styles.link}>고객센터</Link>
        </nav>
        <p className={styles.copy}>© 2026 AWSome. All rights reserved.</p>
      </div>
    </footer>
  );
}
