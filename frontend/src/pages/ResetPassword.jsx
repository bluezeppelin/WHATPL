import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { useCapsLock, CapsLockWarning } from '../hooks/useCapsLock';
import styles from './Login.module.css';

export default function ResetPassword() {
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
      setError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || '비밀번호 초기화에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>비밀번호 초기화 완료</h1>
          <div className={styles.form}>
            <p style={{ color: 'var(--text, #fff)', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1.6 }}>
              비밀번호가 성공적으로 초기화되었습니다.<br />새 비밀번호로 로그인하세요.
            </p>
            <button className={styles.submitBtn} onClick={() => navigate('/login')}>
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>비밀번호 초기화</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>아이디</label>
            <input
              className={styles.input}
              type="text"
              name="loginId"
              value={form.loginId}
              onChange={handleChange}
              placeholder="가입한 아이디"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>이메일</label>
            <input
              className={styles.input}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="가입 시 입력한 이메일"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>새 비밀번호</label>
            <input
              className={styles.input}
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              onKeyDown={pwNewCaps.handler}
              onKeyUp={pwNewCaps.handler}
              onBlur={pwNewCaps.reset}
              placeholder="새 비밀번호 입력"
              required
            />
            <CapsLockWarning on={pwNewCaps.on} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>새 비밀번호 확인</label>
            <input
              className={styles.input}
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              onKeyDown={pwConfirmCaps.handler}
              onKeyUp={pwConfirmCaps.handler}
              onBlur={pwConfirmCaps.reset}
              placeholder="새 비밀번호 재입력"
              required
            />
            <CapsLockWarning on={pwConfirmCaps.on} />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? '처리 중...' : '비밀번호 초기화'}
          </button>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', textAlign: 'center', margin: 0 }}>
            현재는 시연용 간단 초기화 방식입니다. 실제 서비스에서는 이메일 인증이 필요합니다.
          </p>
        </form>

        <div className={styles.links}>
          <Link to="/login" className={styles.link}>로그인으로 돌아가기</Link>
          <span className={styles.divider}>|</span>
          <Link to="/find-id" className={styles.link}>아이디 찾기</Link>
        </div>
      </div>
    </div>
  );
}
