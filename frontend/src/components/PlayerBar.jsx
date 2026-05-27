import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../context/AuthContext';
import NowPlayingPanel from './NowPlayingPanel';
import { extractCoverColor } from '../utils/extractCoverColor';
import styles from './PlayerBar.module.css';

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='40' stroke='%23c89f62' stroke-width='3' fill='none'/%3E%3Ccircle cx='100' cy='100' r='12' fill='%23c89f62'/%3E%3C/svg%3E";

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

/* ─── 카드 내부 컨트롤 (center: play, left: prev, right: next) ─── */
function CardControl({ ctrlType, ctrlProps }) {
  if (!ctrlType) return null;

  if (ctrlType === 'play') {
    const { isPlaying, disabled, onClick } = ctrlProps;
    return (
      <button
        className={`${styles.cardCtrl} ${styles.cardCtrlCenter}`}
        onClick={onClick}
        disabled={disabled}
        title={isPlaying ? '일시정지' : '재생'}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    );
  }

  if (ctrlType === 'prev') {
    const { disabled, onClick } = ctrlProps;
    return (
      <button
        className={`${styles.cardCtrl} ${styles.cardCtrlSide}`}
        onClick={onClick}
        disabled={disabled}
        title="이전"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </svg>
      </button>
    );
  }

  if (ctrlType === 'next') {
    const { disabled, onClick } = ctrlProps;
    return (
      <button
        className={`${styles.cardCtrl} ${styles.cardCtrlSide}`}
        onClick={onClick}
        disabled={disabled}
        title="다음"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
          <path d="M6 18l8.5-6L6 6v12z"/>
          <path d="M16 6v12h2V6h-2z"/>
        </svg>
      </button>
    );
  }

  return null;
}

/* ─── Ghost 카드 ─── */
function GhostCard({ position, ctrlType, ctrlProps }) {
  return (
    <div className={`${styles.card} ${styles[`card_${position}`]} ${styles.cardGhost}`}>
      <div className={styles.ghostInner}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <CardControl ctrlType={ctrlType} ctrlProps={ctrlProps} />
    </div>
  );
}

/* ─── 앨범 카드 (컨트롤 overlay 포함) ─── */
function AlbumCard({ item, ctrlType, ctrlProps }) {
  const { type, track, position } = item;

  if (type === 'ghost') {
    return <GhostCard position={position} ctrlType={ctrlType} ctrlProps={ctrlProps} />;
  }

  return (
    <div className={`${styles.card} ${styles[`card_${position}`]}`}>
      <img
        src={track.coverUrl || DEFAULT_COVER}
        alt={track.title}
        className={styles.cardImg}
        onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
      />
      <CardControl ctrlType={ctrlType} ctrlProps={ctrlProps} />
    </div>
  );
}

/* ─── PlayerBar 본체 ─── */
export default function PlayerBar() {
  const {
    currentTrack, currentIndex, currentPlaylist, playKey, isPlaying, audioRef,
    play, pause, playNext, playPrev,
    repeatMode, shuffle, cycleRepeat, toggleShuffle,
    skipPlayRef, restoredTimeRef, restorePlayerSession,
  } = usePlayer();
  const { user, loading: authLoading } = useAuth();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [coverColor, setCoverColor] = useState(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const progressRef = useRef(null);

  // 카드 스택 아이템 빌드 — 7개 슬롯
  const queue = currentPlaylist?.tracks || [];
  const len = queue.length;
  const idx = currentIndex ?? -1;
  const stackItems = (() => {
    const POSITIONS = ['farfarLeft', 'farLeft', 'left', 'center', 'right', 'farRight', 'farfarRight'];
    const OFFSETS   = [-3, -2, -1, 0, 1, 2, 3];
    const ghost = (pos, off) => ({ type: 'ghost', position: pos, offset: off });
    const real  = (t, pos, off) => ({ type: 'track', track: t, position: pos, offset: off });
    const circ  = (off) => {
      const i = ((idx + off) % len + len) % len;
      return queue[i] || null;
    };

    if (len === 0 || idx < 0) return POSITIONS.map((pos, i) => ghost(pos, OFFSETS[i]));
    const ct = queue[idx];
    if (!ct) return POSITIONS.map((pos, i) => ghost(pos, OFFSETS[i]));

    if (len === 1) return [
      ghost('farfarLeft', -3), ghost('farLeft', -2), ghost('left', -1),
      real(ct, 'center', 0),
      ghost('right', 1), ghost('farRight', 2), ghost('farfarRight', 3),
    ];
    if (len === 2) return [
      ghost('farfarLeft', -3), ghost('farLeft', -2), real(circ(-1), 'left', -1),
      real(ct, 'center', 0),
      ghost('right', 1), ghost('farRight', 2), ghost('farfarRight', 3),
    ];
    if (len === 3) return [
      ghost('farfarLeft', -3), ghost('farLeft', -2), real(circ(-1), 'left', -1),
      real(ct, 'center', 0),
      real(circ(1), 'right', 1), ghost('farRight', 2), ghost('farfarRight', 3),
    ];
    if (len === 4) return [
      ghost('farfarLeft', -3), real(circ(-2), 'farLeft', -2), real(circ(-1), 'left', -1),
      real(ct, 'center', 0),
      real(circ(1), 'right', 1), ghost('farRight', 2), ghost('farfarRight', 3),
    ];
    if (len === 5) return [
      ghost('farfarLeft', -3), real(circ(-2), 'farLeft', -2), real(circ(-1), 'left', -1),
      real(ct, 'center', 0),
      real(circ(1), 'right', 1), real(circ(2), 'farRight', 2), ghost('farfarRight', 3),
    ];
    if (len === 6) return [
      ghost('farfarLeft', -3), real(circ(-2), 'farLeft', -2), real(circ(-1), 'left', -1),
      real(ct, 'center', 0),
      real(circ(1), 'right', 1), real(circ(2), 'farRight', 2), real(circ(3), 'farfarRight', 3),
    ];
    return OFFSETS.map((off, i) => real(circ(off), POSITIONS[i], off));
  })();

  // farfarLeft, farLeft, farRight, farfarRight는 장식용 — prev/play/next만 카드 overlay
  const cardCtrlMap = {
    farfarLeft:  { ctrlType: null,   ctrlProps: {} },
    farLeft:     { ctrlType: null,   ctrlProps: {} },
    left:        { ctrlType: 'prev', ctrlProps: { disabled: !currentTrack, onClick: playPrev } },
    center:      { ctrlType: 'play', ctrlProps: { isPlaying, disabled: !currentTrack, onClick: () => currentTrack && (isPlaying ? pause() : play(currentTrack)) } },
    right:       { ctrlType: 'next', ctrlProps: { disabled: !currentTrack, onClick: playNext } },
    farRight:    { ctrlType: null,   ctrlProps: {} },
    farfarRight: { ctrlType: null,   ctrlProps: {} },
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime   = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded  = () => playNext();
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioRef, playNext]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setHasCheckedSession(true);
      return;
    }
    Promise.resolve(restorePlayerSession()).finally(() => setHasCheckedSession(true));
  }, [authLoading, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.src = currentTrack.audioUrl;
    audio.volume = isMuted ? 0 : volume;
    if (skipPlayRef.current) {
      audio.currentTime = restoredTimeRef.current;
      skipPlayRef.current = false;
      restoredTimeRef.current = 0;
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [currentTrack, playKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!currentTrack?.coverUrl) { setCoverColor(null); return; }
    let cancelled = false;
    extractCoverColor(currentTrack.coverUrl)
      .then(color => { if (!cancelled) setCoverColor(color); })
      .catch(() => { if (!cancelled) setCoverColor(null); });
    return () => { cancelled = true; };
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const seek = (e) => {
    if (!progressRef.current || !audioRef.current || !currentTrack) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const progress = duration && currentTrack ? (currentTime / duration) * 100 : 0;

  const barStyle = (() => {
    let r = 168, g = 85, b = 247;
    if (coverColor) {
      let [cr, cg, cb] = coverColor;
      const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
      if (lum > 115) {
        const factor = 115 / lum;
        cr = Math.round(cr * factor); cg = Math.round(cg * factor); cb = Math.round(cb * factor);
      } else if (lum < 40 && lum > 0) {
        const factor = 65 / lum;
        cr = Math.min(255, Math.round(cr * factor));
        cg = Math.min(255, Math.round(cg * factor));
        cb = Math.min(255, Math.round(cb * factor));
      }
      const sat = Math.max(cr, cg, cb) - Math.min(cr, cg, cb);
      if (sat >= 18) { r = cr; g = cg; b = cb; }
    }
    return { '--cover-rgb': `${r}, ${g}, ${b}` };
  })();

  return (
    <>
      <audio ref={audioRef} />
      <NowPlayingPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      <div className={styles.bar} style={barStyle}>

        {/* ── 상단 경계선 = progress bar ── */}
        <div
          className={styles.progressBorder}
          ref={progressRef}
          onClick={seek}
          style={!currentTrack ? { cursor: 'default', pointerEvents: 'none' } : {}}
        >
          <div className={styles.progressBorderFill} style={{ width: `${progress}%` }} />
          {currentTrack && <div className={styles.progressBorderThumb} style={{ left: `${progress}%` }} />}
          <span className={styles.timeLeft}>{formatTime(currentTrack ? currentTime : 0)}</span>
          <span className={styles.timeRight}>{formatTime(currentTrack ? duration : 0)}</span>
        </div>

        {/* 좌: 곡 정보 */}
        <div className={styles.trackInfo}>
          {currentTrack ? (
            <>
              <img
                src={currentTrack.coverUrl || DEFAULT_COVER}
                alt={currentTrack.title}
                className={styles.cover}
                onError={e => { e.currentTarget.src = DEFAULT_COVER; }}
              />
              <div className={styles.text}>
                <p className={styles.title}>{currentTrack.title}</p>
                <p className={styles.artist}>{currentTrack.artist}</p>
              </div>
            </>
          ) : hasCheckedSession ? (
            <div className={styles.text}>
              <p className={styles.emptyHint}>재생 중인 곡이 없습니다</p>
            </div>
          ) : null}
        </div>

        {/* ── 가운데: 앨범 카드 스택 + 셔플/반복 보조 버튼 ── */}
        <div className={styles.albumStack}>

          {/* 셔플 — farfarLeft 카드 바로 왼쪽 */}
          <button
            className={`${styles.auxBtn} ${styles.auxBtnLeft} ${shuffle ? styles.auxBtnActive : ''}`}
            onClick={toggleShuffle}
            title={shuffle ? '셔플 켜짐' : '셔플 꺼짐'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4zM14.83 13.41l-1.41 1.41 2.61 2.61L14 19.5h6v-6l-2.04 2.04z"/>
            </svg>
          </button>

          {/* 앨범 카드들 (7장) */}
          {stackItems.map(item => {
            const ctrl = cardCtrlMap[item.position] || {};
            return (
              <AlbumCard
                key={item.position}
                item={item}
                ctrlType={ctrl.ctrlType}
                ctrlProps={ctrl.ctrlProps}
              />
            );
          })}

          {/* 반복 — farfarRight 카드 바로 오른쪽 */}
          <button
            className={`${styles.auxBtn} ${styles.auxBtnRight} ${repeatMode !== 'none' ? styles.auxBtnActive : ''}`}
            onClick={cycleRepeat}
            title={repeatMode === 'none' ? '반복 없음' : repeatMode === 'all' ? '전체 반복' : '한 곡 반복'}
          >
            <span className={styles.auxBtnRepeatWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
              </svg>
              {repeatMode === 'one' && <span className={styles.auxBtnRepeatOne}>1</span>}
            </span>
          </button>

        </div>

        {/* 우: 재생목록 + 볼륨 */}
        <div className={styles.right}>
            <button
              className={`${styles.iconBtn} ${panelOpen ? styles.iconBtnActive : ''}`}
              onClick={() => setPanelOpen(o => !o)}
              onMouseDown={e => e.stopPropagation()}
              title="재생 목록"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
            </button>
            <button className={styles.iconBtn} onClick={() => setIsMuted(m => !m)}>
              {isMuted || volume === 0 ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0} max={1} step={0.02}
              value={isMuted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); setIsMuted(false); }}
              className={styles.volumeSlider}
            />
          </div>

      </div>
    </>
  );
}
