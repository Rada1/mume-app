/**
 * @file useSessionRecorder.ts
 * @description Hook for recording MUME sessions as lightweight data logs.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { saveSessionToDb } from '../utils/storage/sessionDb';
import type { LogEntryType, LogEntry, FlagEntry, FlagKind, SessionLog } from '../types/session';
import { useVitalsStore } from '../stores/useVitalsStore';

export type { LogEntryType, LogEntry, FlagEntry, FlagKind, SessionLog };

// --- Logic Section ---
// --- Recording Limits ---
const MAX_SEGMENT_ENTRIES = 2_000;
const MAX_SEGMENT_DURATION_MS = 5 * 60 * 1_000;
const isMobileDevice = (): boolean => typeof navigator !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

export const useSessionRecorder = () => {
  const instanceIdRef = useRef(Math.random().toString(36).substring(7));
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const entriesRef = useRef<LogEntry[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const segmentStartTimeRef = useRef<number>(startTimeRef.current);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef(false);
  const segmentOnMobileRef = useRef(false);
  const archiveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const recordedCharacterRef = useRef<string | null>(null);
  const sessionTypeRef = useRef<'user' | 'spectate'>('user');
  const spectatedCharacterRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback((characterName?: string, type: 'user' | 'spectate' = 'user', spectatedCharacter?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    recordingRef.current = true;
    segmentOnMobileRef.current = isMobileDevice();
    setIsRecording(true);
    entriesRef.current = [];
    startTimeRef.current = Date.now();
    segmentStartTimeRef.current = startTimeRef.current;
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

  // --- Segment Archiving ---
  const createLog = useCallback((entries: LogEntry[], startedAt: number, characterName?: string): SessionLog => {
    const charInfo = useVitalsStore.getState().characterInfo;
    return {
      version: 1,
      startTime: new Date(startedAt).toISOString(),
      log: entries,
      metadata: {
        character: characterName || recordedCharacterRef.current || undefined,
        client: 'MUME AI Studio',
        version: '1.0.0',
        type: sessionTypeRef.current,
        spectatedCharacter: spectatedCharacterRef.current || undefined,
        race: charInfo?.race || undefined,
        subrace: charInfo?.subrace || undefined,
      }
    };
  }, []);

  const archiveSegment = useCallback((log: SessionLog) => {
    archiveQueueRef.current = archiveQueueRef.current
      .then(() => saveSessionToDb(log).then(() => undefined))
      .catch(error => console.error('[Recorder] Failed to archive session segment:', error));
  }, []);

  const recordEntry = useCallback((type: LogEntryType, data: any, options?: { mask?: boolean }) => {
    if (!recordingRef.current) return;
    let recordedData = data;
    if (options?.mask) {
      if (type === 'tx') {
        recordedData = '********';
      } else if (type === 'ui' && data?.event === 'executeCommand' && data?.cmd) {
        recordedData = { ...data, cmd: '********' };
      }
    }

    const t = Date.now() - segmentStartTimeRef.current;
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
    if (segmentOnMobileRef.current && (entriesRef.current.length >= MAX_SEGMENT_ENTRIES || t >= MAX_SEGMENT_DURATION_MS)) {
      const segment = createLog(entriesRef.current, segmentStartTimeRef.current);
      entriesRef.current = [];
      segmentStartTimeRef.current = Date.now();
      archiveSegment(segment);
    }
  }, [archiveSegment, createLog]);

  const stopRecording = useCallback((characterName?: string): SessionLog => {
    recordingRef.current = false;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const log = createLog(entriesRef.current, segmentStartTimeRef.current, characterName);
    entriesRef.current = [];
    return log;
  }, [createLog]);

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
    await archiveQueueRef.current;
    // Always save to internal library
    if (log.log.length > 0) await saveToLibrary(log);
    
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
