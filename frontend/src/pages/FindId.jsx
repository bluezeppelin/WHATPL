import { useState } from 'react';
import { Link } from 'react-router-dom';
import { findLoginId } from '../api/auth';
import styles from './Login.module.css';

export default function FindId() {
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
      setError(err.response?.data?.message || '일치하는 계정을 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>아이디 찾기</h1>

        {!result ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>이름</label>
              <input
                className={styles.input}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="가입 시 입력한 이름"
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
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? '조회 중...' : '아이디 찾기'}
            </button>
          </form>
        ) : (
          <div className={styles.form}>
            <div className={styles.resultBox}>
              <p className={styles.resultLabel}>찾은 아이디</p>
              <p className={styles.resultId}>{result.loginId}</p>
              {result.status === 'inactive' && (
                <p className={styles.inactiveNotice}>이 계정은 현재 비활성화 상태입니다. 관리자에게 문의하세요.</p>
              )}
            </div>
            <Link to="/login" className={styles.submitBtn} style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              로그인하기
            </Link>
          </div>
        )}

        <div className={styles.links}>
          <Link to="/login" className={styles.link}>로그인으로 돌아가기</Link>
          <span className={styles.divider}>|</span>
          <Link to="/reset-password" className={styles.link}>비밀번호 초기화</Link>
        </div>
      </div>
    </div>
  );
}
