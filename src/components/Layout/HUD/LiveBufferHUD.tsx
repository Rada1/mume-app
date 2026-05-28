import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Play, Pause, Zap } from 'lucide-react';
import { useGame, useUI } from '../../../context/GameContext';
import { useModeStore } from '../../../stores/useModeStore';
import { useMessageStore } from '../../../stores/useMessageStore';

const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${(m % 60).toString().padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${(s % 60).toString().padStart(2, '0')}s`;
    return `${s}s`;
};

const REWIND_OPTIONS = [
    { label: '30s', ms: 30_000 },
    { label: '5m',  ms: 300_000 },
    { label: '15m', ms: 900_000 },
    { label: '30m', ms: 1_800_000 },
];

export const LiveBufferHUD: React.FC = () => {
    const { spectateBuffer } = useUI();
    const messages = useMessageStore(s => s.spectate);
    const isSpectating = useModeStore(s => s.isSpectating);
    const scrubberRef = useRef<HTMLDivElement>(null);

    const [pos, setPos] = useState<{ right: number; top: number } | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; startRight: number; startTop: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, input')) return;
        if (scrubberRef.current?.contains(e.target as Node)) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const currentRight = window.innerWidth - rect.right;
        const currentTop = rect.top;
        dragRef.current = { startX: e.clientX, startY: e.clientY, startRight: currentRight, startTop: currentTop };
    }, []);

    const handleDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPos({
            right: Math.max(0, dragRef.current.startRight - dx),
            top: Math.max(0, dragRef.current.startTop + dy),
        });
    }, []);

    const handleDragPointerUp = useCallback(() => {
        dragRef.current = null;
    }, []);

    // Session start = timestamp of the first snoop message, falling back to first message.
    const sessionStart = useMemo(() => {
        for (let i = 0; i < messages.length; i++) {
            const m = messages[i] as any;
            if (m.isSnoop || m.type === 'snoop' || m.type === 'snoop-command' || m.type === 'snoop-vitals') {
                return m.timestamp as number;
            }
        }
        return messages.length > 0 ? (messages[0] as any).timestamp as number : Date.now();
    }, [messages]);

    // Also show when there are snoop messages, even if isSpectating flag isn't set yet.
    const hasSnoopMessages = useMemo(() =>
        messages.some((m: any) => m.isSnoop || m.type === 'snoop' || m.type === 'snoop-command'),
    [messages]);

    const sessionDurationMs = Date.now() - sessionStart;

    const currentPositionMs = spectateBuffer.isLive
        ? sessionDurationMs
        : Math.max(0, spectateBuffer.displayCutoff - sessionStart);

    const progress = sessionDurationMs > 0
        ? Math.min(100, (currentPositionMs / sessionDurationMs) * 100)
        : 100;

    const lagMs = spectateBuffer.isLive ? 0 : Math.max(0, sessionDurationMs - currentPositionMs);

    const handleScrubberClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = scrubberRef.current?.getBoundingClientRect();
        if (!rect || sessionDurationMs <= 0) return;
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const ts = sessionStart + pct * sessionDurationMs;
        if (ts >= Date.now() - 2000) {
            spectateBuffer.jumpToLive();
        } else {
            spectateBuffer.seekTo(ts);
        }
    }, [sessionStart, sessionDurationMs, spectateBuffer]);

    if (!isSpectating && !hasSnoopMessages) return null;

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        top: pos ? `${pos.top}px` : (isSpectating ? '300px' : '80px'),
        right: pos ? `${pos.right}px` : '16px',
        zIndex: 10000,
        cursor: 'grab',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        border: spectateBuffer.isLive
            ? '1px solid rgba(255,255,255,0.12)'
            : '1px solid rgba(74,144,226,0.4)',
        borderRadius: '8px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace",
        color: '#fff',
        boxShadow: spectateBuffer.isLive ? '0 4px 15px rgba(0,0,0,0.5)' : '0 0 20px rgba(74,144,226,0.2)',
        minWidth: '240px',
        maxWidth: '300px',
        userSelect: 'none',
        pointerEvents: 'auto',
    };

    const btnBase: React.CSSProperties = {
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '5px',
        color: '#ccc',
        cursor: 'pointer',
        padding: '3px 7px',
        fontSize: '0.7rem',
        fontWeight: 600,
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
    };

    return (
        <div
            ref={containerRef}
            style={containerStyle}
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
        >
            {/* Header row: DVR label + LIVE indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', fontWeight: 700 }}>DVR</span>
                <div style={{ flex: 1 }} />
                {spectateBuffer.isLive ? (
                    <div style={{
                        background: 'rgba(255,60,60,0.15)',
                        border: '1px solid rgba(255,60,60,0.4)',
                        borderRadius: '5px',
                        padding: '2px 7px',
                        fontSize: '0.68rem',
                        color: '#ff6060',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff4444', display: 'inline-block' }} />
                        LIVE
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {lagMs > 1000 && (
                            <span style={{ fontSize: '0.66rem', color: '#f0a040' }}>-{fmt(lagMs)}</span>
                        )}
                        <button
                            onClick={spectateBuffer.jumpToLive}
                            style={{ ...btnBase, background: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,60,60,0.4)', color: '#ff7070', fontWeight: 700 }}
                        >
                            <Zap size={11} /> LIVE
                        </button>
                    </div>
                )}
            </div>

            {/* Scrubber (shown whenever there's session history) */}
            {sessionDurationMs > 5000 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#555' }}>
                        <span>0:00</span>
                        <span style={{ color: '#888' }}>{fmt(currentPositionMs)} / {fmt(sessionDurationMs)}</span>
                    </div>
                    <div
                        ref={scrubberRef}
                        style={{ position: 'relative', height: '7px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={handleScrubberClick}
                    >
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)', borderRadius: '4px' }} />
                        <div style={{
                            position: 'absolute', top: 0, left: 0, height: '100%',
                            width: `${progress}%`,
                            background: spectateBuffer.isLive ? 'rgba(255,96,96,0.6)' : '#4a90e2',
                            borderRadius: '4px',
                            transition: 'width 0.2s linear',
                        }} />
                        <div style={{
                            position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
                            left: `${progress}%`, width: '10px', height: '10px',
                            borderRadius: '50%', background: '#fff',
                            boxShadow: '0 0 4px rgba(0,0,0,0.8)',
                            pointerEvents: 'none',
                        }} />
                    </div>
                </div>
            )}

            {/* Go-back presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.62rem', color: '#555', whiteSpace: 'nowrap' }}>Go back:</span>
                {REWIND_OPTIONS.map(opt => {
                    const canGoBack = sessionDurationMs >= opt.ms;
                    return (
                        <button
                            key={opt.label}
                            style={{ ...btnBase, opacity: canGoBack ? 1 : 0.3, cursor: canGoBack ? 'pointer' : 'default' }}
                            disabled={!canGoBack}
                            onClick={() => spectateBuffer.goBack(opt.ms)}
                        >
                            -{opt.label}
                        </button>
                    );
                })}
                <button
                    style={{ ...btnBase, opacity: sessionDurationMs > 5000 ? 1 : 0.3, cursor: sessionDurationMs > 5000 ? 'pointer' : 'default' }}
                    disabled={sessionDurationMs <= 5000}
                    onClick={() => spectateBuffer.seekTo(sessionStart)}
                >
                    Start
                </button>
            </div>

            {/* Play/Pause (only when not at live) */}
            {!spectateBuffer.isLive && (
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={spectateBuffer.isPlaying ? spectateBuffer.pause : spectateBuffer.play}
                        style={{ ...btnBase, border: '1px solid rgba(74,144,226,0.4)', color: '#4a90e2', flex: 1, justifyContent: 'center' }}
                    >
                        {spectateBuffer.isPlaying ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Play</>}
                    </button>
                </div>
            )}
        </div>
    );
};
