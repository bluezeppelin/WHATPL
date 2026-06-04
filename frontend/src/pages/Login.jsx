import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useCapsLock, CapsLockWarning } from '../hooks/useCapsLock';
import styles from './Login.module.css';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const redirectMessage = location.state?.message || '';

  const [form, setForm] = useState({ loginId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pwCaps = useCapsLock();

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginApi(form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('login.error_default'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('login.title')}</h1>

        {redirectMessage && (
          <p className={styles.redirectMsg}>{redirectMessage}</p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>{t('login.label_id')}</label>
            <input
              className={styles.input}
              type="text"
              name="loginId"
              value={form.loginId}
              onChange={handleChange}
              placeholder={t('login.placeholder_id')}
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('login.label_password')}</label>
            <input
              className={styles.input}
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              onKeyDown={pwCaps.handler}
              onKeyUp={pwCaps.handler}
              onBlur={pwCaps.reset}
              placeholder={t('login.placeholder_password')}
              autoComplete="current-password"
              required
            />
            <CapsLockWarning on={pwCaps.on} />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? t('login.button_submit_loading') : t('login.button_submit')}
          </button>
        </form>

        <div className={styles.links}>
          <Link to="/find-id" className={styles.link}>{t('login.link_find_id')}</Link>
          <span className={styles.divider}>|</span>
          <Link to="/reset-password" className={styles.link}>{t('login.link_reset_password')}</Link>
        </div>

        <p className={styles.signupPrompt}>
          {t('login.signup_prompt')}{' '}
          <Link to="/signup" className={styles.signupLink}>{t('login.signup_link')}</Link>
        </p>
      </div>
    </div>
  );
}
