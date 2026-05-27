import { useState, useRef, useEffect } from 'react';
import { updateTrack } from '../api/tracks';
import styles from './EditTrackModal.module.css';
import { GENRES as BASE_GENRES } from '../constants/genres';

const GENRES = ['', ...BASE_GENRES];

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='40' stroke='%237c5cfc' stroke-width='3' fill='none'/%3E%3Ccircle cx='100' cy='100' r='12' fill='%237c5cfc'/%3E%3C/svg%3E";

export default function EditTrackModal({ track, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: track.title,
    artist: track.artist,
    genre: track.genre || '',
    description: track.description || '',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(track.coverUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const coverInputRef = useRef(null);
  const overlayRef = useRef(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const onCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('제목을 입력해주세요.');
    if (!form.artist.trim()) return setError('아티스트 이름을 입력해주세요.');
    if (!form.genre) return setError('장르를 선택해주세요.');

    setSaving(true);
    setError('');

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (coverFile) fd.append('cover', coverFile);

      const updated = await updateTrack(track.id, fd);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '저장에 실패했습니다.');
      setSaving(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.heading}>트랙 정보 수정</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <div className={styles.topRow}>
            {/* 커버 이미지 변경 */}
            <div className={styles.coverArea}>
              <button
                type="button"
                className={styles.coverBtn}
                onClick={() => coverInputRef.current?.click()}
              >
                <img
                  src={coverPreview || DEFAULT_COVER}
                  alt="cover"
                  className={styles.coverImg}
                  onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
                />
                <div className={styles.coverOverlay}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  <span>변경</span>
                </div>
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className={styles.hidden}
                onChange={onCoverChange}
              />
              <p className={styles.coverHint}>클릭하여 커버 변경</p>
            </div>

            {/* 제목 + 아티스트 */}
            <div className={styles.mainFields}>
              <div className={styles.field}>
                <label className={styles.label}>제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={styles.input}
                  placeholder="트랙 제목"
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>아티스트 *</label>
                <input
                  type="text"
                  value={form.artist}
                  onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
                  className={styles.input}
                  placeholder="아티스트 이름"
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>장르 *</label>
            <select
              value={form.genre}
              onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              className={styles.select}
            >
              <option value="">장르 선택</option>
              {GENRES.filter(Boolean).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>설명</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={styles.textarea}
              placeholder="트랙에 대해 소개해주세요..."
              rows={4}
              maxLength={500}
            />
            <span className={styles.charCount}>{form.description.length} / 500</span>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              취소
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? (
                <>
                  <span className={styles.savingSpinner} />
                  저장 중...
                </>
              ) : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
