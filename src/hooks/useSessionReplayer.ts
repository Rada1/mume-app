/**
 * @file useSessionReplayer.ts
 * @description Hook for playing back recorded MUME sessions.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { SessionLog } from '../types';

export interface ReplayerState {
  isPlaying: boolean;
  currentTime: number; // ms offset
  duration: number;
  speed: number;
  currentIndex: number;
  isExporting: boolean;
  isVisible: boolean;
  isPrivacyMode: boolean;
}

export const useSessionReplayer = (onData: (type: 'rx' | 'tx' | 'gmcp', data: any, isPrivacyMode: boolean) => void) => {
  const [log, setLog] = useState<SessionLog | null>(null);
  const [state, setState] = useState<ReplayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    currentIndex: 0,
    isExporting: false,
    isVisible: false,
    isPrivacyMode: false
  });

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
    setState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      speed: 1,
      currentIndex: 0,
      isExporting: false,
      isVisible: false,
      isPrivacyMode: stateRef.current.isPrivacyMode
    });
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const loadLog = useCallback((newLog: SessionLog) => {
    if (!newLog || !newLog.entries) {
      console.error('[Replayer] Invalid log uploaded:', newLog);
      return;
    }
    console.log('[Replayer] Loading log with entries:', newLog.entries.length);
    setLog(newLog);
    logRef.current = newLog;
    const duration = newLog.entries.length > 0 
      ? newLog.entries[newLog.entries.length - 1].t 
      : 0;
    console.log('[Replayer] Calculated duration:', duration);
    
    console.log('[Replayer] Updating state with duration:', duration);
    setState({
      isPlaying: false,
      currentTime: 0,
      duration,
      speed: 1,
      currentIndex: 0,
      isExporting: false,
      isVisible: true,
      isPrivacyMode: stateRef.current.isPrivacyMode
    });
  }, []);

  const pause = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setState(s => ({ ...s, isPlaying: false }));
  }, []);

  const stopExport = useCallback(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
  }, []);

  const setIsVisible = useCallback((visible: boolean) => {
      setState(s => ({ ...s, isVisible: visible }));
  }, []);
  
  const setPrivacyMode = useCallback((active: boolean) => {
      setState(s => ({ ...s, isPrivacyMode: active }));
  }, []);

  const play = useCallback(() => {
    if (!logRef.current) return;

    const isAtEnd = stateRef.current.currentTime >= stateRef.current.duration;
    const startFrom = isAtEnd ? 0 : stateRef.current.currentTime;
    
    if (isAtEnd) {
        setState(s => ({ ...s, isPlaying: true, currentTime: 0, currentIndex: 0 }));
        stateRef.current = { ...stateRef.current, isPlaying: true, currentTime: 0, currentIndex: 0 };
    } else {
        setState(s => ({ ...s, isPlaying: true }));
    }

    startTimeRef.current = Date.now() - (startFrom / stateRef.current.speed);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) * stateRef.current.speed;
      
      if (elapsed >= stateRef.current.duration) {
        pause();
        setState(s => ({ ...s, currentTime: s.duration, isPlaying: false }));
        if (stateRef.current.isExporting) {
            stopExport();
        }
        return;
      }

      // Process entries between old and new time
      const entries = logRef.current!.entries;
      let idx = stateRef.current.currentIndex;
      
      while (idx < entries.length && entries[idx].t <= elapsed) {
        const entry = entries[idx];
        if (entry.typ === 'rx' || entry.typ === 'tx' || entry.typ === 'gmcp') {
            onDataRef.current(entry.typ as any, entry.d, stateRef.current.isPrivacyMode);
        }
        idx++;
      }

      setState(s => ({ ...s, currentTime: elapsed, currentIndex: idx }));
    }, 50); // 20fps check
  }, [onData, pause, stopExport]);

  const seek = useCallback((timeMs: number) => {
    if (!logRef.current) return;
    
    const entries = logRef.current.entries;
    let idx = 0;
    
    while (idx < entries.length && entries[idx].t <= timeMs) {
      idx++;
    }

    setState(s => ({ ...s, currentTime: timeMs, currentIndex: idx }));
    if (stateRef.current.isPlaying) {
        startTimeRef.current = Date.now() - (timeMs / stateRef.current.speed);
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
      const isPlaying = stateRef.current.isPlaying;
      const currentTime = stateRef.current.currentTime;
      
      setState(s => ({ ...s, speed }));
      
      if (isPlaying) {
          startTimeRef.current = Date.now() - (currentTime / speed);
      }
  }, []);

  const startExport = useCallback(async () => {
      try {
          const stream = await (navigator.mediaDevices as any).getDisplayMedia({
              video: { cursor: "always" },
              audio: false
          });

          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
          mediaRecorderRef.current = recorder;
          chunksRef.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: 'video/webm' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `mume-replay-${Date.now()}.webm`;
              a.click();
              
              stream.getTracks().forEach((track: any) => track.stop());
              setState(s => ({ ...s, isExporting: false }));
          };

          setState(s => ({ ...s, isExporting: true, speed: 1 }));
          
          setTimeout(() => {
              seek(0);
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
    startExport,
    stopExport,
    state
  };
};
