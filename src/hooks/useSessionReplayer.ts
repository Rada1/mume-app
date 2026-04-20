/**
 * @file useSessionReplayer.ts
 * @description Hook for playing back recorded MUME sessions.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SessionLog } from '../types';
import { useSessionStore } from '../stores/useSessionStore';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export interface ReplayerState {
  isPlaying: boolean;
  currentTime: number; // ms offset
  duration: number;
  speed: number;
  currentIndex: number;
  isExporting: boolean;
  isVisible: boolean;
  isPrivacyMode: boolean;
  searchResults: number[];
  trimRange: [number | null, number | null];
}

export const useSessionReplayer = (onData: (type: 'rx' | 'tx' | 'gmcp', data: any, isPrivacyMode: boolean, isSilent?: boolean) => void) => {
  const [log, setLog] = useState<SessionLog | null>(null);
  
  // Use Zustand stores for state
  const isPlaying = useSessionStore(s => s.isPlaying);
  const currentTime = useSessionStore(s => s.currentTime);
  const duration = useSessionStore(s => s.duration);
  const speed = useSessionStore(s => s.playbackSpeed);
  const currentIndex = useSessionStore(s => s.currentIndex);
  const searchResults = useSessionStore(s => s.searchResults);
  const trimRange = useSessionStore(s => s.trimRange);
  
  const setReplayerState = useSessionStore(s => s.setReplayerState);
  
  const isVisible = useUIStore(s => s.showReplayHud);
  const setIsVisible = useUIStore(s => s.setShowReplayHud);

  const [isExporting, setIsExporting] = useState(false);
  const [isPrivacyMode, setPrivacyMode] = useState(false);

  // Computed state for backward compatibility with components using this hook
  const state = useMemo(() => ({
    isPlaying,
    currentTime,
    duration,
    speed,
    currentIndex,
    isExporting,
    isVisible,
    isPrivacyMode,
    searchResults,
    trimRange
  }), [isPlaying, currentTime, duration, speed, currentIndex, isExporting, isVisible, isPrivacyMode, searchResults, trimRange]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const logRef = useRef<SessionLog | null>(null);
  const stateRef = useRef<ReplayerState>(state);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onDataRef = useRef(onData);
  
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearLog = useCallback(() => {
    console.log('[Replayer] Clearing log');
    setLog(null);
    logRef.current = null;
    setReplayerState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackSpeed: 1,
      currentIndex: 0,
      searchResults: [],
      trimRange: [null, null]
    });
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const loadLog = useCallback((newLog: SessionLog) => {
    if (!newLog || !newLog.log) {
      console.error('[Replayer] Invalid log uploaded:', newLog);
      return;
    }
    setLog(newLog);
    logRef.current = newLog;
    const durationCount = newLog.log.length > 0 
      ? newLog.log[newLog.log.length - 1].t 
      : 0;
    
    setReplayerState({
      isPlaying: false,
      currentTime: 0,
      duration: durationCount,
      playbackSpeed: 1,
      currentIndex: 0,
      searchResults: [],
      trimRange: [null, null],
    });
    setIsVisible(true);
  }, []);

  const attachToLive = useCallback((liveLog: SessionLog) => {
    console.log('[Replayer] Attaching to live log');
    setLog(liveLog);
    logRef.current = liveLog;
    const durationValue = liveLog.log.length > 0 ? liveLog.log[liveLog.log.length - 1].t : 0;
    setReplayerState({
      isPlaying: false,
      currentTime: durationValue,
      duration: durationValue,
      currentIndex: liveLog.log.length,
    });
    setIsVisible(true);
  }, []);

  const updateLiveDuration = useCallback(() => {
    if (!logRef.current) return;
    const lastEntry = logRef.current.log[logRef.current.log.length - 1];
    if (lastEntry && lastEntry.t > duration) {
      setReplayerState({ duration: lastEntry.t });
    }
  }, [duration, setReplayerState]);

  const pause = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setReplayerState({ isPlaying: false });
  }, [setReplayerState]);

  const stopExport = useCallback(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
  }, []);

  const setTrimRange = useCallback((range: [number | null, number | null]) => {
      setReplayerState({ trimRange: range });
  }, [setReplayerState]);

  const performSearch = useCallback((query: string) => {
    if (!logRef.current || !query.trim()) {
      setReplayerState({ searchResults: [] });
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matches: number[] = [];
    const entries = logRef.current.log;

    // Search through rx, tx, and sys entries for the query
    const decoder = new TextDecoder();
    for (const entry of entries) {
      if (entry.typ === 'rx' || entry.typ === 'tx' || entry.typ === 'sys') {
        let text = '';
        if (typeof entry.d === 'string') {
          text = entry.d;
        } else if (Array.isArray(entry.d) || entry.d instanceof Uint8Array) {
          // Decode binary rx data
          text = decoder.decode(new Uint8Array(entry.d));
        } else {
          text = JSON.stringify(entry.d);
        }

        // Strip telnet and ANSI codes to perform a clean text search
        const cleanText = text
          .replace(/\x1b\[[0-9;]*m/g, '') // Strip ANSI
          .replace(/\xff\xfa[\s\S]*?\xff\xf0/g, '') // Strip Telnet Subnegotiation (IAC SB ... IAC SE)
          .replace(/[\xff\xfb\xfc\xfd\xfe]./g, '') // Strip Telnet WILL/WONT/DO/DONT
          .toLowerCase();

        if (cleanText.includes(lowerQuery)) {
          // If we have multiple matches very close together, just take the first one
          // to avoid cluttering the scrubber with too many markers
          const lastMatch = matches[matches.length - 1];
          if (lastMatch === undefined || (entry.t - lastMatch > 500)) {
            matches.push(entry.t);
          }
        }
      }
    }

    setReplayerState({ searchResults: matches });
  }, [setReplayerState]);

  const play = useCallback(() => {
    if (!logRef.current) return;

    const isAtEnd = stateRef.current.currentTime >= stateRef.current.duration;
    const startFrom = isAtEnd ? 0 : stateRef.current.currentTime;
    
    if (isAtEnd) {
        setReplayerState({ isPlaying: true, currentTime: 0, currentIndex: 0 });
        stateRef.current = { ...stateRef.current, isPlaying: true, currentTime: 0, currentIndex: 0 };
    } else {
        setReplayerState({ isPlaying: true });
    }

    startTimeRef.current = Date.now() - (startFrom / stateRef.current.speed);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) * stateRef.current.speed;
      
      if (elapsed >= stateRef.current.duration || (stateRef.current.isExporting && stateRef.current.trimRange?.[1] !== null && elapsed >= stateRef.current.trimRange?.[1])) {
        pause();
        const finalTime = (isExporting && stateRef.current.trimRange?.[1] !== null) ? stateRef.current.trimRange[1] : stateRef.current.duration;
        setReplayerState({ currentTime: finalTime, isPlaying: false });
        if (isExporting) {
            stopExport();
        }
        return;
      }

      // Process entries between old and new time
      const entries = logRef.current!.log;
      let idx = stateRef.current.currentIndex;
      
      while (idx < entries.length && entries[idx].t <= elapsed) {
        const entry = entries[idx];
        if (entry.typ === 'rx' || entry.typ === 'tx' || entry.typ === 'gmcp') {
            onDataRef.current(entry.typ as any, entry.d, stateRef.current.isPrivacyMode);
        }
        idx++;
      }

      setReplayerState({ currentTime: elapsed, currentIndex: idx });
    }, 50); // 20fps check
  }, [pause, stopExport, isExporting, setReplayerState]);

  const rehydrate = useCallback((timeMs: number) => {
    if (!logRef.current) return;
    
    const entries = logRef.current.log;
    let idx = 0;
    
    // Process all entries silently up to the target time
    while (idx < entries.length && entries[idx].t <= timeMs) {
      const entry = entries[idx];
      // Only re-process GMCP and RX for state rehydration
      if (entry.typ === 'gmcp' || entry.typ === 'rx') {
          // Pass 'true' for silent/rehydrating flag to onData
          onDataRef.current(entry.typ as any, entry.d, stateRef.current.isPrivacyMode, true);
      }
      idx++;
    }
    
    return idx;
  }, []);

  const seek = useCallback((timeMs: number) => {
    if (!logRef.current) return;
    
    const newIndex = rehydrate(timeMs);
    setReplayerState({ currentTime: timeMs, currentIndex: newIndex || 0 });
    if (stateRef.current.isPlaying) {
        startTimeRef.current = Date.now() - (timeMs / stateRef.current.speed);
    }
  }, [rehydrate, setReplayerState]);

  const setSpeed = useCallback((speed: number) => {
      const isCurrentlyPlaying = stateRef.current.isPlaying;
      const currentReplayTime = stateRef.current.currentTime;
      setReplayerState({ playbackSpeed: speed });
      if (isCurrentlyPlaying) {
          startTimeRef.current = Date.now() - (currentReplayTime / speed);
      }
  }, [setReplayerState]);

  const exportAsText = useCallback(() => {
      if (!log) return;
      const start = stateRef.current.trimRange[0] || 0;
      const end = stateRef.current.trimRange[1] || stateRef.current.duration;
      
      const entries = log.log.filter(e => e.t >= start && e.t <= end);
      const decoder = new TextDecoder();
      let content = "";
      
      entries.forEach(entry => {
          if (entry.typ === 'rx') {
              const raw = decoder.decode(new Uint8Array(entry.d));
              // Strip telnet and ANSI
              const clean = raw.replace(/\x1b\[[0-9;]*m/g, '')
                               .replace(/\xff[\xfb-\xfe][\x00-\xff]|\xff\xfa[\x01-\xff]+?\xff\xf0/g, '');
              content += clean;
          } else if (entry.typ === 'tx') {
              const text = typeof entry.d === 'string' ? entry.d : String(entry.d);
              const lower = text.toLowerCase();
              if (!lower.includes('change width') && !lower.includes('change length') && !lower.includes('cha wid') && !lower.includes('cha len')) {
                  content += `\n> ${text}\n`;
              }
          }
      });

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mume-log-${Date.now()}.txt`;
      a.click();
  }, [log]);

  const startExport = useCallback(async () => {
      try {
          const stream = await (navigator.mediaDevices as any).getDisplayMedia({
              video: { cursor: "always" },
              audio: false
          });

          const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=h264') 
              ? 'video/mp4;codecs=h264' 
              : 'video/webm;codecs=vp9';

          const recorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = recorder;
          chunksRef.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: mimeType });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
              a.download = `mume-replay-${Date.now()}.${ext}`;
              a.click();
              
              stream.getTracks().forEach((track: any) => track.stop());
              setIsExporting(false);
          };

          setIsExporting(true);
          setSpeed(1);
          
          setTimeout(() => {
              const startAt = stateRef.current.trimRange?.[0] || 0;
              seek(startAt);
              recorder.start();
              play();
          }, 100);
      } catch (err) {
          console.error("Failed to start export:", err);
      }
  }, [play, seek]);

  return {
    log,
    loadLog,
    clearLog,
    play,
    pause,
    seek,
    setSpeed,
    setIsVisible,
    setPrivacyMode,
    performSearch,
    startExport,
    exportAsText,
    stopExport,
    setTrimRange,
    state
  };
};
