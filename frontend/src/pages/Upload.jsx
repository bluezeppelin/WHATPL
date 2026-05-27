import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { uploadTrack } from '../api/tracks';
import { useAuth } from '../context/AuthContext';
import { createCreatorRequest, getMyCreatorRequest } from '../api/creatorRequests';
import styles from './Upload.module.css';
import { GENRES } from '../constants/genres';

export default function Upload() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Creator 신청 상태 (user role 전용)
  const [creatorRequest, setCreatorRequest] = useState(undefined); // undefined=로딩, null=없음, object=있음
  const [creatorForm, setCreatorForm] = useState({ message: '' });
  const [creatorError, setCreatorError] = useState('');
  const [creatorSubmitting, setCreatorSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'user') {
      getMyCreatorRequest()
        .then(data => setCreatorRequest(data.request))
        .catch(() => setCreatorRequest(null));
    }
  }, [user]);

  async function handleCreatorSubmit(e) {
    e.preventDefault();
    setCreatorError('');
    setCreatorSubmitting(true);
    try {
      const data = await createCreatorRequest(creatorForm.message);
      setCreatorRequest(data.request);
    } catch (err) {
      setCreatorError(err.response?.data?.error || 'Creator 신청에 실패했습니다.');
    } finally {
      setCreatorSubmitting(false);
    }
  }

  const [form, setForm] = useState({ title: '', genre: '', description: '' });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onAudioDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      if (!form.title) setForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }));
    }
  };

  const onCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) return setError('오디오 파일을 선택해주세요.');
    if (!form.title.trim()) return setError('제목을 입력해주세요.');
    if (!form.genre) return setError('장르를 선택해주세요.');

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const fd = new FormData();
      fd.append('audio', audioFile);
      if (coverFile) fd.append('cover', coverFile);
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));

      await uploadTrack(fd, setProgress);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '업로드에 실패했습니다. 다시 시도해주세요.');
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.gateBox}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-tertiary)">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <h2 className={styles.gateTitle}>로그인이 필요합니다</h2>
            <p className={styles.gateDesc}>업로드 기능을 사용하려면 로그인해주세요.</p>
            <div className={styles.gateActions}>
              <Link to="/login" className={styles.gatePrimary}>로그인</Link>
              <Link to="/signup" className={styles.gateSecondary}>회원가입</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (user.role !== 'creator') {
    const isAdmin = user.role === 'admin';
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.gateBox}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-tertiary)">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <h2 className={styles.gateTitle}>Creator 회원 전용</h2>
            <p className={styles.gateDesc}>
              음원 업로드는 <strong>Creator 회원</strong>만 사용할 수 있습니다.
            </p>
            {isAdmin ? (
              <p className={styles.gateDesc}>
                관리자 계정은 음원 업로드를 사용할 수 없습니다. 사이트 관리는 <strong>관리자 콘솔</strong>을 이용해주세요.
              </p>
            ) : (
              <p className={styles.gateDesc}>
                Creator 신청 후 관리자 승인을 받으면 음원을 업로드할 수 있습니다.
              </p>
            )}
          </div>

          {/* Creator 신청 폼 영역 — admin은 신청 자체가 의미 없으므로 숨김 */}
          {!isAdmin && <div className={styles.requestBox}>
            {creatorRequest === undefined && (
              <p className={styles.requestLoading}>신청 상태 확인 중...</p>
            )}

            {creatorRequest !== undefined && creatorRequest !== null && (
              <div className={styles.requestPending}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--accent)">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <p className={styles.requestPendingTitle}>Creator 신청 완료 — 승인 대기 중</p>
                <p className={styles.requestPendingInfo}>
                  신청 크리에이터명: <strong>{creatorRequest.artistName}</strong>
                </p>
                <p className={styles.requestPendingHint}>
                  관리자 승인 후 업로드 기능을 사용할 수 있습니다.
                </p>
              </div>
            )}

            {creatorRequest === null && (
              <>
                <h3 className={styles.requestTitle}>Creator 신청하기</h3>
                <form onSubmit={handleCreatorSubmit} className={styles.requestForm}>
                  <div className={styles.requestField}>
                    <label className={styles.requestLabel}>크리에이터명</label>
                    {user.artistName ? (
                      <>
                        <p className={styles.requestInput} style={{ margin: 0, cursor: 'default' }}>{user.artistName}</p>
                        <p className={styles.requestHint}>
                          회원가입 시 등록한 크리에이터명이 Creator 활동명으로 사용됩니다.
                        </p>
                      </>
                    ) : (
                      <p className={styles.requestHint} style={{ color: 'var(--danger, #f87171)' }}>
                        크리에이터명이 등록되어 있지 않습니다. 마이페이지에서 먼저 등록해주세요.
                      </p>
                    )}
                  </div>
                  <div className={styles.requestField}>
                    <label className={styles.requestLabel}>신청 메시지 (선택)</label>
                    <textarea
                      className={styles.requestTextarea}
                      value={creatorForm.message}
                      onChange={e => setCreatorForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Creator로 활동하고 싶은 이유를 간단히 작성해주세요."
                      rows={3}
                      maxLength={300}
                    />
                  </div>
                  {creatorError && <p className={styles.requestError}>{creatorError}</p>}
                  <button
                    type="submit"
                    className={styles.requestSubmitBtn}
                    disabled={creatorSubmitting || !user.artistName}
                  >
                    {creatorSubmitting ? '신청 중...' : 'Creator 신청하기'}
                  </button>
                </form>
              </>
            )}
          </div>}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>트랙 업로드</h1>
        <p className={styles.sub}>음악을 공유하고 더 많은 사람들에게 들려주세요</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.dropRow}>
            {/* 오디오 드롭존 */}
            <div
              className={`${styles.dropzone} ${audioFile ? styles.dropzoneFilled : ''}`}
              onClick={() => audioInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={onAudioDrop}
            >
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className={styles.hiddenInput}
                onChange={onAudioDrop}
              />
              {audioFile ? (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--success)">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <p className={styles.dropFilename}>{audioFile.name}</p>
                  <p className={styles.dropHint}>{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-tertiary)">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  <p className={styles.dropLabel}>오디오 파일을 드래그하거나 클릭하세요</p>
                  <p className={styles.dropHint}>MP3, WAV, OGG, FLAC (최대 50MB)</p>
                </>
              )}
            </div>

            {/* 커버 이미지 */}
            <div
              className={`${styles.coverDrop} ${coverPreview ? styles.coverFilled : ''}`}
              onClick={() => coverInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); onCoverChange({ target: { files: e.dataTransfer.files } }); }}
            >
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={onCoverChange}
              />
              {coverPreview ? (
                <img src={coverPreview} alt="cover preview" className={styles.coverPreview} />
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--text-tertiary)">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                  <p className={styles.dropHint}>커버 이미지<br />(선택)</p>
                </>
              )}
            </div>
          </div>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={styles.input}
                placeholder="트랙 제목"
                maxLength={100}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>크리에이터</label>
              {user.artistName ? (
                <>
                  <p className={styles.artistDisplay}>{user.artistName}</p>
                  <p className={styles.artistHint}>크리에이터명은 회원정보에 등록된 이름이 자동으로 사용됩니다.</p>
                </>
              ) : (
                <p className={styles.artistWarning}>
                  크리에이터명이 등록되어 있지 않습니다.{' '}
                  <Link to="/mypage" className={styles.artistLink}>마이페이지</Link>에서 먼저 등록해주세요.
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>장르 *</label>
              <select
                value={form.genre}
                onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                className={styles.select}
              >
                <option value="">장르 선택</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>설명</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={styles.textarea}
                placeholder="트랙에 대해 소개해주세요..."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {uploading && (
            <div className={styles.progressWrapper}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <p className={styles.progressText}>{progress}% 업로드 중...</p>
            </div>
          )}

          <button type="submit" disabled={uploading || !user.artistName} className={styles.submitBtn}>
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </form>
      </div>
    </main>
  );
}
