import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './InfoPage.module.css';

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('privacy.title')}</h1>
          <p className={styles.subtitle}>{t('privacy.updated')}</p>
        </header>

        <div className={styles.notice}>{t('privacy.notice')}</div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.s1_title')}</h2>
          <p className={styles.body}>{t('privacy.s1_intro')}</p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('privacy.table_item')}</th>
                  <th>{t('privacy.table_required')}</th>
                  <th>{t('privacy.table_note')}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{t('privacy.row1_item')}</td><td>{t('privacy.table_required_yes')}</td><td>{t('privacy.row1_note')}</td></tr>
                <tr><td>{t('privacy.row2_item')}</td><td>{t('privacy.table_required_yes')}</td><td>{t('privacy.row2_note')}</td></tr>
                <tr><td>{t('privacy.row3_item')}</td><td>{t('privacy.table_required_yes')}</td><td>{t('privacy.row3_note')}</td></tr>
                <tr><td>{t('privacy.row4_item')}</td><td>{t('privacy.table_required_yes')}</td><td>{t('privacy.row4_note')}</td></tr>
                <tr><td>{t('privacy.row5_item')}</td><td>{t('privacy.table_required_yes')}</td><td>{t('privacy.row5_note')}</td></tr>
                <tr><td>{t('privacy.row6_item')}</td><td>{t('privacy.table_required_yes')}</td><td>{t('privacy.row6_note')}</td></tr>
                <tr><td>{t('privacy.row7_item')}</td><td>{t('privacy.table_required_no')}</td><td>{t('privacy.row7_note')}</td></tr>
                <tr><td>{t('privacy.row8_item')}</td><td>{t('privacy.table_required_no')}</td><td>{t('privacy.row8_note')}</td></tr>
                <tr><td>{t('privacy.row9_item')}</td><td>{t('privacy.table_required_no')}</td><td>{t('privacy.row9_note')}</td></tr>
                <tr><td>{t('privacy.row10_item')}</td><td>{t('privacy.table_required_no')}</td><td>{t('privacy.row10_note')}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.s2_title')}</h2>
          <ul className={styles.list}>
            <li>{t('privacy.s2_item1')}</li>
            <li>{t('privacy.s2_item2')}</li>
            <li>{t('privacy.s2_item3')}</li>
            <li>{t('privacy.s2_item4')}</li>
            <li>{t('privacy.s2_item5')}</li>
            <li>{t('privacy.s2_item6')}</li>
            <li>{t('privacy.s2_item7')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.s3_title')}</h2>
          <p className={styles.body}>{t('privacy.s3_body')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.s4_title')}</h2>
          <ul className={styles.list}>
            <li>{t('privacy.s4_item1')}</li>
            <li>{t('privacy.s4_item2')}</li>
            <li>{t('privacy.s4_item3')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.s5_title')}</h2>
          <ul className={styles.list}>
            <li>{t('privacy.s5_item1')}</li>
            <li>{t('privacy.s5_item2')}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.s6_title')}</h2>
          <p className={styles.body}>{t('privacy.s6_body')}</p>
        </section>

        <div className={styles.related}>
          <Link to="/terms" className={styles.relatedLink}>{t('privacy.link_terms')}</Link>
          <Link to="/support" className={styles.relatedLink}>{t('privacy.link_support')}</Link>
        </div>
      </div>
    </div>
  );
}
