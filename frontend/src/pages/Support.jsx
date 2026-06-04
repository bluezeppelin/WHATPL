import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './InfoPage.module.css';

export default function Support() {
  const { t } = useTranslation();
  const [openIdx, setOpenIdx] = useState({});

  const FAQS = [
    {
      title: t('support.sec1_title'),
      items: [
        { q: t('support.s1q1'), a: t('support.s1a1') },
        { q: t('support.s1q2'), a: t('support.s1a2') },
        { q: t('support.s1q3'), a: t('support.s1a3') },
      ],
    },
    {
      title: t('support.sec2_title'),
      items: [
        { q: t('support.s2q1'), a: t('support.s2a1') },
        { q: t('support.s2q2'), a: t('support.s2a2') },
        { q: t('support.s2q3'), a: t('support.s2a3') },
      ],
    },
    {
      title: t('support.sec3_title'),
      items: [
        { q: t('support.s3q1'), a: t('support.s3a1') },
        { q: t('support.s3q2'), a: t('support.s3a2') },
        { q: t('support.s3q3'), a: t('support.s3a3') },
      ],
    },
    {
      title: t('support.sec4_title'),
      items: [
        { q: t('support.s4q1'), a: t('support.s4a1') },
        { q: t('support.s4q2'), a: t('support.s4a2') },
        { q: t('support.s4q3'), a: t('support.s4a3') },
      ],
    },
  ];

  function toggle(catI, itemI) {
    const key = `${catI}-${itemI}`;
    setOpenIdx(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('support.title')}</h1>
          <p className={styles.subtitle}>{t('support.subtitle')}</p>
        </header>

        {FAQS.map((cat, catI) => (
          <section key={catI} className={styles.section}>
            <h2 className={styles.sectionTitle}>{cat.title}</h2>
            <div className={styles.faqList}>
              {cat.items.map((item, itemI) => {
                const key = `${catI}-${itemI}`;
                const isOpen = !!openIdx[key];
                return (
                  <div key={itemI} className={styles.faqItem}>
                    <button
                      className={styles.faqQ}
                      onClick={() => toggle(catI, itemI)}
                      aria-expanded={isOpen}
                    >
                      <span className={styles.faqQLabel}>Q</span>
                      <span className={styles.faqQText}>{item.q}</span>
                      <span className={`${styles.faqArrow} ${isOpen ? styles.faqArrowOpen : ''}`}>▾</span>
                    </button>
                    {isOpen && (
                      <div className={styles.faqA}>
                        <span className={styles.faqALabel}>A</span>
                        <span className={styles.faqAText}>{item.a}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className={styles.related}>
          <Link to="/terms" className={styles.relatedLink}>{t('support.link_terms')}</Link>
          <Link to="/privacy" className={styles.relatedLink}>{t('support.link_privacy')}</Link>
        </div>
      </div>
    </div>
  );
}
