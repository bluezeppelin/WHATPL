import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../api/auth';
import { useCapsLock, CapsLockWarning } from '../hooks/useCapsLock';
import styles from './Login.module.css';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ loginId: '', email: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const pwNewCaps = useCapsLock();
  const pwConfirmCaps = useCapsLock();

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError(t('resetpw.error_password_mismatch'));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || t('resetpw.error_default'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>{t('resetpw.completion_title')}</h1>
          <div className={styles.form}>
            <p style={{ color: 'var(--text, #fff)', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1.6 }}>
              {t('resetpw.completion_desc').split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </p>
            <button className={styles.submitBtn} onClick={() => navigate('/login')}>
              {t('findid.button_login')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('resetpw.title')}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>{t('resetpw.label_id')}</label>
            <input
              className={styles.input}
              type="text"
              name="loginId"
              value={form.loginId}
              onChange={handleChange}
              placeholder={t('resetpw.placeholder_id')}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('resetpw.label_email')}</label>
            <input
              className={styles.input}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('resetpw.placeholder_email')}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('resetpw.label_new_password')}</label>
            <input
              className={styles.input}
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              onKeyDown={pwNewCaps.handler}
              onKeyUp={pwNewCaps.handler}
              onBlur={pwNewCaps.reset}
              placeholder={t('resetpw.placeholder_new_password')}
              required
            />
            <CapsLockWarning on={pwNewCaps.on} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('resetpw.label_confirm_password')}</label>
            <input
              className={styles.input}
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              onKeyDown={pwConfirmCaps.handler}
              onKeyUp={pwConfirmCaps.handler}
              onBlur={pwConfirmCaps.reset}
              placeholder={t('resetpw.placeholder_confirm_password')}
              required
            />
            <CapsLockWarning on={pwConfirmCaps.on} />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? t('resetpw.button_loading') : t('resetpw.button_submit')}
          </button>
        </form>

        <div className={styles.links}>
          <Link to="/login" className={styles.link}>{t('resetpw.link_back')}</Link>
          <span className={styles.divider}>|</span>
          <Link to="/find-id" className={styles.link}>{t('resetpw.link_find_id')}</Link>
        </div>
      </div>
    </div>
  );
}
