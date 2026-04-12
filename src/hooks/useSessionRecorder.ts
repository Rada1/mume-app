/**
 * @file useSessionRecorder.ts
 * @description Hook for recording MUME sessions as lightweight data logs.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type LogEntryType = 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys';

export interface LogEntry {
  t: number; // timestamp offset from start in ms
  typ: LogEntryType;
  d: any; // data
}

export interface SessionLog {
  version: number;
  startTime: string;
  entries: LogEntry[];
  metadata: {
    client: string;
    version: string;
    character?: string;
  };
}

export const useSessionRecorder = () => {
  const [isRecording, setIsRecording] = useState(true);
  const [duration, setDuration] = useState(0);
  const entriesRef = useRef<LogEntry[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Automatically start recording on mount
    if (isRecording) {
      startRecording();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback((characterName?: string) => {
    setIsRecording(true);
    entriesRef.current = [];
    startTimeRef.current = Date.now();
    setDuration(0);

    // Initial metadata entry
    entriesRef.current.push({
      t: 0,
      typ: 'sys',
      d: { event: 'start', character: characterName, client: 'MUME AI Studio', version: '1.0.0' }
    });

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const recordEntry = useCallback((type: LogEntryType, data: any, options?: { mask?: boolean }) => {
    if (!isRecording) return;

    let recordedData = data;
    if (options?.mask && type === 'tx') {
      recordedData = '********';
    }

    entriesRef.current.push({
      t: Date.now() - startTimeRef.current,
      typ: type,
      d: recordedData
    });
  }, [isRecording]);

  const stopRecording = useCallback((): SessionLog => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const log: SessionLog = {
      version: 1,
      startTime: new Date(startTimeRef.current).toISOString(),
      entries: entriesRef.current,
      metadata: {
        client: 'MUME AI Studio',
        version: '1.0.0'
      }
    };

    return log;
  }, []);

  const saveLog = useCallback((log: SessionLog) => {
    const blob = new Blob([JSON.stringify(log)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date(log.startTime).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `mume-session-${dateStr}.mume-log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    recordEntry,
    saveLog
  };
};
