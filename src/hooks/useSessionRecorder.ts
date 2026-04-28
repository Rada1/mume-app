/**
 * @file useSessionRecorder.ts
 * @description Hook for recording MUME sessions as lightweight data logs.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { saveSessionToDb } from '../utils/storage/sessionDb';
import type { LogEntryType, LogEntry, FlagEntry, FlagKind, SessionLog } from '../types/session';

export type { LogEntryType, LogEntry, FlagEntry, FlagKind, SessionLog };

export const useSessionRecorder = () => {
  const instanceIdRef = useRef(Math.random().toString(36).substring(7));
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const entriesRef = useRef<LogEntry[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedCharacterRef = useRef<string | null>(null);
  const sessionTypeRef = useRef<'user' | 'spectate'>('user');
  const spectatedCharacterRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback((characterName?: string, type: 'user' | 'spectate' = 'user', spectatedCharacter?: string) => {
    setIsRecording(true);
    entriesRef.current.length = 0;
    startTimeRef.current = Date.now();
    recordedCharacterRef.current = characterName || null;
    sessionTypeRef.current = type;
    spectatedCharacterRef.current = spectatedCharacter || null;
    setDuration(0);

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
    let recordedData = data;
    if (options?.mask) {
      if (type === 'tx') {
        recordedData = '********';
      } else if (type === 'ui' && data?.event === 'executeCommand' && data?.cmd) {
        recordedData = { ...data, cmd: '********' };
      }
    }

    const t = Date.now() - startTimeRef.current;
    entriesRef.current.push({ t, typ: type, d: recordedData });

    // Death flag detection on rx entries (pre-processed format: { text: string })
    if (type === 'rx') {
      let text: string = '';
      if (typeof data === 'string') {
        text = data;
      } else if (data && typeof data === 'object' && typeof data.text === 'string') {
        text = data.text; // pre-processed message from useMessageLog
      } else {
        const bytes = data instanceof Uint8Array ? data : Array.isArray(data) ? new Uint8Array(data) : null;
        text = bytes ? new TextDecoder().decode(bytes) : '';
      }

      if (text.includes('You are dead!')) {
        entriesRef.current.push({ t, typ: 'flag', d: { kind: 'death_self' } });
      }

      const enemyDeathMatch = text.match(/\*([^*]+)\* has drawn his last breath! R\.I\.P\./);
      if (enemyDeathMatch) {
        entriesRef.current.push({ t, typ: 'flag', d: { kind: 'death_enemy_player', name: enemyDeathMatch[1] } });
      }
    }
  }, []);

  const stopRecording = useCallback((characterName?: string): SessionLog => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const log: SessionLog = {
      version: 1,
      startTime: new Date(startTimeRef.current).toISOString(),
      log: [...entriesRef.current],
      metadata: {
        character: characterName || recordedCharacterRef.current || undefined,
        client: 'MUME AI Studio',
        version: '1.0.0',
        type: sessionTypeRef.current,
        spectatedCharacter: spectatedCharacterRef.current || undefined,
      }
    };

    return log;
  }, []);

  const saveLog = useCallback((log: SessionLog) => {
    const blob = new Blob([JSON.stringify(log)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date(log.startTime).toISOString().replace(/[:.]/g, '-').slice(0, 10);
    const charPrefix = log.metadata.character ? `[${log.metadata.character}] ` : '';
    a.href = url;
    a.download = `${charPrefix}mume-session-${dateStr}.mume-log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const saveToLibrary = useCallback(async (log: SessionLog) => {
    try {
      const id = await saveSessionToDb(log);
      console.log(`[Recorder] Session archived in library with ID: ${id}`);
      return id;
    } catch (e) {
      console.error('[Recorder] Failed to save to library:', e);
      return null;
    }
  }, []);

  const stopAndSave = useCallback(async (characterName?: string, download = false) => {
    const log = stopRecording(characterName);
    
    // Always save to internal library
    await saveToLibrary(log);
    
    // Optionally trigger a download
    if (download) {
      saveLog(log);
    }
    
    return log;
  }, [stopRecording, saveLog, saveToLibrary]);

  return useMemo(() => ({
    isRecording,
    duration,
    entries: entriesRef.current,
    instanceIdRef,
    startRecording,
    stopRecording,
    stopAndSave,
    recordEntry,
    saveLog,
    saveToLibrary
  }), [isRecording, duration, startRecording, stopRecording, stopAndSave, recordEntry, saveLog, saveToLibrary]);
};
