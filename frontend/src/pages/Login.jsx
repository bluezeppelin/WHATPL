import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useCapsLock, CapsLockWarning } from '../hooks/useCapsLock';
import styles from './Login.module.css';

export default function Login() {
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
      setError(err.response?.data?.error || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>로그인</h1>

        {redirectMessage && (
          <p className={styles.redirectMsg}>{redirectMessage}</p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>아이디</label>
            <input
              className={styles.input}
              type="text"
              name="loginId"
              value={form.loginId}
              onChange={handleChange}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>비밀번호</label>
            <input
              className={styles.input}
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              onKeyDown={pwCaps.handler}
              onKeyUp={pwCaps.handler}
              onBlur={pwCaps.reset}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              required
            />
            <CapsLockWarning on={pwCaps.on} />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className={styles.links}>
          <Link to="/find-id" className={styles.link}>아이디 찾기</Link>
          <span className={styles.divider}>|</span>
          <Link to="/reset-password" className={styles.link}>비밀번호 초기화</Link>
        </div>

        <p className={styles.signupPrompt}>
          계정이 없으신가요?{' '}
          <Link to="/signup" className={styles.signupLink}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}
