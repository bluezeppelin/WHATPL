import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { findLoginId } from '../api/auth';
import styles from './Login.module.css';

export default function FindId() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await findLoginId(form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || t('findid.error_not_found'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('findid.title')}</h1>

        {!result ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t('findid.label_name')}</label>
              <input
                className={styles.input}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t('findid.placeholder_name')}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('findid.label_email')}</label>
              <input
                className={styles.input}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t('findid.placeholder_email')}
                required
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? t('findid.button_loading') : t('findid.button_submit')}
            </button>
          </form>
        ) : (
          <div className={styles.form}>
            <div className={styles.resultBox}>
              <p className={styles.resultLabel}>{t('findid.result_label')}</p>
              <p className={styles.resultId}>{result.loginId}</p>
              {result.status === 'inactive' && (
                <p className={styles.inactiveNotice}>{t('findid.result_inactive_notice')}</p>
              )}
            </div>
            <Link to="/login" className={styles.submitBtn} style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              {t('findid.button_login')}
            </Link>
          </div>
        )}

        <div className={styles.links}>
          <Link to="/login" className={styles.link}>{t('findid.link_back')}</Link>
          <span className={styles.divider}>|</span>
          <Link to="/reset-password" className={styles.link}>{t('findid.link_reset')}</Link>
        </div>
      </div>
    </div>
  );
}
