import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { incrementPlay } from '../api/tracks';
import { getPlaylist, addTrackToPlaylist } from '../api/playlists';
import { addRecentlyPlayed } from '../api/recentlyPlayed';
import { getMyPlayerSession, savePlayerSession } from '../api/playerSession';

const PlayerContext = createContext(null);

const DEFAULT_PLAYLIST = { id: '0', name: '기본 재생목록', tracks: [], queueType: 'allTracks', queueSourceId: null };

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState(DEFAULT_PLAYLIST);
  // 실제로 새 곡을 재생할 때만 증가 → PlayerBar가 이 값으로 오디오 재시작을 판단
  const [playKey, setPlayKey] = useState(0);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none' | 'all' | 'one'
  const [shuffle, setShuffle] = useState(false);
  const audioRef = useRef(null);
  const shuffleHistoryRef = useRef([]);
  const skipPlayRef = useRef(false);
  const restoredTimeRef = useRef(0);
  const isRestoringRef = useRef(false);

  const bumpKey = useCallback(() => setPlayKey(k => k + 1), []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(m => m === 'none' ? 'all' : m === 'all' ? 'one' : 'none');
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(s => !s);
    shuffleHistoryRef.current = [];
  }, []);

  const pause = useCallback(() => {
    const ct = audioRef.current?.currentTime || 0;
    audioRef.current?.pause();
    setIsPlaying(false);
    if (currentTrack) {
      savePlayerSession({
        trackId: currentTrack.id,
        currentTime: ct,
        queueTrackIds: currentPlaylist.tracks.map(t => t.id),
        currentIndex,
        queueType: currentPlaylist.queueType || 'allTracks',
        queueSourceId: currentPlaylist.queueSourceId || null,
        repeatMode,
        shuffle,
      }).catch(() => {});
    }
  }, [currentTrack, currentPlaylist, currentIndex, repeatMode, shuffle]);

  const play = useCallback(async (track, playlistContext = null, index = -1) => {
    const isSame = currentTrack?.id === track.id &&
      (index === -1 || index === currentIndex);
    if (isSame) {
      if (index === -1) {
        // PlayerBar 토글: 일시정지 ↔ 재생
        if (isPlaying) {
          audioRef.current?.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current?.play();
          setIsPlaying(true);
        }
      } else {
        // 목록에서 현재 곡 클릭: 처음부터 재시작
        bumpKey();
        setIsPlaying(true);
      }
      return;
    }
    if (playlistContext) setCurrentPlaylist(playlistContext);
    if (index !== -1) setCurrentIndex(index);
    setCurrentTrack(track);
    setIsPlaying(true);
    bumpKey();
    incrementPlay(track.id).catch(() => {});
    addRecentlyPlayed(track.id).catch(() => {});
  }, [currentTrack, currentIndex, isPlaying, bumpKey]);

  // 홈/탐색/상세에서 재생 → 기본 재생목록 맨 뒤에 추가 후 전환
  const playToDefault = useCallback(async (track, queueType = 'allTracks') => {
    let prevTracks;
    if (currentPlaylist.id === '0') {
      prevTracks = currentPlaylist.tracks;
    } else {
      try {
        const pl0 = await getPlaylist('0');
        prevTracks = pl0.tracks || [];
      } catch {
        prevTracks = [];
      }
    }

    // Melon식: 새 곡을 큐 최상단에 prepend, 중복도 허용
    const newTracks = [track, ...prevTracks];
    const newIndex = 0;

    setCurrentPlaylist({ id: '0', name: '기본 재생목록', tracks: newTracks, queueType, queueSourceId: null });
    setCurrentIndex(newIndex);
    setCurrentTrack(track);
    setIsPlaying(true);
    bumpKey();
    incrementPlay(track.id).catch(() => {});
    addRecentlyPlayed(track.id).catch(() => {});
    addTrackToPlaylist('0', track.id).catch(() => {});
  }, [currentPlaylist, bumpKey]);

  // 플레이리스트 전체 재생 (처음부터)
  const loadPlaylist = useCallback((playlist, tracks) => {
    shuffleHistoryRef.current = [];
    setCurrentPlaylist({ id: playlist.id, name: playlist.name, tracks, queueType: 'playlist', queueSourceId: playlist.id });
    setCurrentIndex(tracks.length > 0 ? 0 : -1);
    if (tracks.length > 0) {
      setCurrentTrack(tracks[0]);
      setIsPlaying(true);
      bumpKey();
      incrementPlay(tracks[0].id).catch(() => {});
      addRecentlyPlayed(tracks[0].id).catch(() => {});
    }
  }, [bumpKey]);

  // 플레이리스트에서 트랙 삭제 → currentPlaylist 즉시 반영 (trackId 기반)
  // setCurrentPlaylist에 functional update 사용 → 연속 삭제 시에도 최신 state 기준으로 동작
  const syncRemoveTrack = useCallback((playlistId, trackId, removeIdx) => {
    if (currentPlaylist.id !== playlistId) return;

    const tracks = currentPlaylist.tracks;
    // 인덱스가 전달되면 정확히 그 항목만 제거 — 중복 트랙 보존
    const idx = (typeof removeIdx === 'number' && removeIdx >= 0 && removeIdx < tracks.length)
      ? removeIdx
      : tracks.findIndex(t => t.id === trackId);
    if (idx === -1) return;

    // newTracks를 한 번만 계산해서 playlist 갱신과 index 보정에 동일하게 사용
    const newTracks = tracks.filter((_, i) => i !== idx);

    setCurrentPlaylist(prev => ({
      ...prev,
      tracks: prev.tracks.filter((_, i) => i !== idx),
    }));

    if (idx === currentIndex) {
      if (newTracks.length === 0) {
        audioRef.current?.pause();
        setCurrentTrack(null);
        setCurrentIndex(-1);
        setIsPlaying(false);
      } else {
        const nextIndex = Math.min(idx, newTracks.length - 1);
        setCurrentIndex(nextIndex);
        setCurrentTrack(newTracks[nextIndex]);
        bumpKey();
        incrementPlay(newTracks[nextIndex].id).catch(() => {});
        addRecentlyPlayed(newTracks[nextIndex].id).catch(() => {});
      }
    } else if (idx < currentIndex) {
      setCurrentIndex(ci => ci - 1);
    }
  }, [currentPlaylist, currentIndex, audioRef, bumpKey]);

  // 플레이리스트 순서 변경 시 currentPlaylist + currentIndex 즉시 반영
  const syncReorderTracks = useCallback((playlistId, newTracks, fromIdx, toIdx) => {
    if (currentPlaylist.id !== playlistId) return;
    setCurrentPlaylist(prev => ({ ...prev, tracks: newTracks }));
    setCurrentIndex(prev => {
      if (prev === fromIdx) return toIdx;
      if (fromIdx < toIdx && prev > fromIdx && prev <= toIdx) return prev - 1;
      if (fromIdx > toIdx && prev >= toIdx && prev < fromIdx) return prev + 1;
      return prev;
    });
  }, [currentPlaylist.id]);

  const resetPlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentTrack(null);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setCurrentPlaylist(DEFAULT_PLAYLIST);
    setRepeatMode('none');
    setShuffle(false);
    shuffleHistoryRef.current = [];
  }, []);

  const restorePlayerSession = useCallback(async () => {
    try {
      const session = await getMyPlayerSession();
      if (!session || !session.track) return;
      const queueTracks = session.queueTracks?.length > 0 ? session.queueTracks : [session.track];
      const idx = queueTracks.findIndex(t => t.id === session.track.id);
      const currentIdx = idx !== -1 ? idx : 0;
      isRestoringRef.current = true;
      skipPlayRef.current = true;
      restoredTimeRef.current = session.currentTime || 0;
      setCurrentPlaylist({
        id: session.queueType === 'playlist' && session.queueSourceId ? session.queueSourceId : '0',
        name: session.queueType === 'playlist' ? '플레이리스트' : '기본 재생목록',
        tracks: queueTracks,
        queueType: session.queueType || 'allTracks',
        queueSourceId: session.queueSourceId || null,
      });
      setCurrentIndex(currentIdx);
      setCurrentTrack(session.track);
      setIsPlaying(false);
      setRepeatMode(session.repeatMode || 'none');
      setShuffle(session.shuffle || false);
    } catch {}
  }, []);

  // 트랙 변경 또는 큐 변경 시 세션 저장 (복원 중이면 스킵)
  useEffect(() => {
    if (!currentTrack) return;
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    savePlayerSession({
      trackId: currentTrack.id,
      currentTime: 0,
      queueTrackIds: currentPlaylist.tracks.map(t => t.id),
      currentIndex,
      queueType: currentPlaylist.queueType || 'allTracks',
      queueSourceId: currentPlaylist.queueSourceId || null,
      repeatMode,
      shuffle,
    }).catch(() => {});
  }, [currentTrack?.id, currentPlaylist.tracks]); // eslint-disable-line react-hooks/exhaustive-deps

  // repeatMode / shuffle 변경 시 세션 저장
  useEffect(() => {
    if (!currentTrack) return;
    savePlayerSession({
      trackId: currentTrack.id,
      currentTime: audioRef.current?.currentTime || 0,
      queueTrackIds: currentPlaylist.tracks.map(t => t.id),
      currentIndex,
      queueType: currentPlaylist.queueType || 'allTracks',
      queueSourceId: currentPlaylist.queueSourceId || null,
      repeatMode,
      shuffle,
    }).catch(() => {});
  }, [repeatMode, shuffle]); // eslint-disable-line react-hooks/exhaustive-deps

  // 트랙 삭제 시 현재 재생목록에서 해당 트랙 ID 전부 제거
  const removeTrackById = useCallback((trackId) => {
    setCurrentPlaylist(prev => {
      const newTracks = prev.tracks.filter(t => t.id !== trackId);
      // 현재 재생 중인 곡이 삭제된 경우 중지
      if (currentTrack?.id === trackId) {
        audioRef.current?.pause();
        setCurrentTrack(null);
        setCurrentIndex(-1);
        setIsPlaying(false);
      } else {
        // 삭제된 트랙이 현재 곡 앞에 있으면 인덱스 보정
        const removedCount = prev.tracks
          .slice(0, currentIndex)
          .filter(t => t.id === trackId).length;
        if (removedCount > 0) setCurrentIndex(i => i - removedCount);
      }
      return { ...prev, tracks: newTracks };
    });
  }, [currentTrack, currentIndex, audioRef]);

  const playNext = useCallback(() => {
    const tracks = currentPlaylist.tracks;
    const len = tracks.length;

    // 한 곡 반복: 현재 곡 처음부터 재시작 (shuffle 무관하게 우선)
    if (repeatMode === 'one' && currentTrack) {
      bumpKey();
      incrementPlay(currentTrack.id).catch(() => {});
      addRecentlyPlayed(currentTrack.id).catch(() => {});
      return;
    }

    let nextIndex;
    if (shuffle && len > 1) {
      shuffleHistoryRef.current.push(currentIndex);
      do { nextIndex = Math.floor(Math.random() * len); }
      while (nextIndex === currentIndex);
    } else {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex >= len) {
      if (repeatMode === 'all') nextIndex = 0;
      else {
        // 반복 없음: 마지막 곡 이후 정지 + UI state 동기화
        setIsPlaying(false);
        return;
      }
    }

    const next = tracks[nextIndex];
    if (!next) return;
    setCurrentTrack(next);
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
    bumpKey();
    incrementPlay(next.id).catch(() => {});
    addRecentlyPlayed(next.id).catch(() => {});
  }, [currentPlaylist, currentIndex, currentTrack, repeatMode, shuffle, bumpKey]);

  const playPrev = useCallback(() => {
    const tracks = currentPlaylist.tracks;

    if (shuffle && shuffleHistoryRef.current.length > 0) {
      const prevIndex = shuffleHistoryRef.current.pop();
      const prev = tracks[prevIndex];
      if (!prev) return;
      setCurrentTrack(prev);
      setCurrentIndex(prevIndex);
      setIsPlaying(true);
      bumpKey();
      incrementPlay(prev.id).catch(() => {});
      addRecentlyPlayed(prev.id).catch(() => {});
      return;
    }

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      // 전체 반복이면 마지막 곡으로, 아니면 첫 곡 유지
      if (repeatMode === 'all') prevIndex = tracks.length - 1;
      else return;
    }

    const prev = tracks[prevIndex];
    if (!prev) return;
    setCurrentTrack(prev);
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
    bumpKey();
    incrementPlay(prev.id).catch(() => {});
    addRecentlyPlayed(prev.id).catch(() => {});
  }, [currentPlaylist, currentIndex, repeatMode, shuffle, bumpKey]);

  return (
    <PlayerContext.Provider value={{
      currentTrack, currentIndex, playKey, isPlaying, audioRef, currentPlaylist,
      repeatMode, shuffle, cycleRepeat, toggleShuffle,
      play, playToDefault, pause, playNext, playPrev, loadPlaylist, syncRemoveTrack, syncReorderTracks, removeTrackById, resetPlayer,
      skipPlayRef, restoredTimeRef, restorePlayerSession,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
