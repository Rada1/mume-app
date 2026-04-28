import React, { useCallback, useMemo, useRef } from 'react';
import { Play, Pause, Zap } from 'lucide-react';
import { useUI, useLog } from '../../../context/GameContext';
import { useModeStore } from '../../../stores/useModeStore';

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
    const { messages } = useLog();
    const isSpectating = useModeStore(s => s.isSpectating);
    const scrubberRef = useRef<HTMLDivElement>(null);

    const sessionStart = useMemo(() => {
        for (let i = 0; i < messages.length; i++) {
            const m = messages[i] as any;
            if (m.isSnoop || m.type === 'snoop' || m.type === 'snoop-command' || m.type === 'snoop-vitals') {
                return m.timestamp as number;
            }
        }
        return messages.length > 0 ? (messages[0] as any).timestamp as number : Date.now();
    }, [messages]);

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
        if (!rect) return;
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const ts = sessionStart + pct * sessionDurationMs;
        if (ts >= Date.now() - 2000) {
            spectateBuffer.jumpToLive();
        } else {
            spectateBuffer.seekTo(ts);
        }
    }, [sessionStart, sessionDurationMs, spectateBuffer]);

    if (!isSpectating) return null;

    const hudStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: spectateBuffer.isLive ? '48px' : '48px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        background: 'rgba(10,10,20,0.92)',
        backdropFilter: 'blur(12px)',
        border: spectateBuffer.isLive
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(74,144,226,0.3)',
        borderRadius: '12px',
        padding: spectateBuffer.isLive ? '6px 12px' : '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: spectateBuffer.isLive ? '280px' : '340px',
        boxShadow: spectateBuffer.isLive
            ? 'none'
            : '0 0 20px rgba(74,144,226,0.15)',
        userSelect: 'none',
    };

    const btnBase: React.CSSProperties = {
        background: 'none',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '6px',
        color: '#ccc',
        cursor: 'pointer',
        padding: '3px 8px',
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        transition: 'all 0.15s',
    };

    if (spectateBuffer.isLive) {
        // Compact bar: quick rewind presets + LIVE indicator
        return (
            <div style={hudStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.05em', marginRight: '2px' }}>DVR</span>
                    {REWIND_OPTIONS.map(opt => {
                        const canGoBack = sessionDurationMs >= opt.ms;
                        return (
                            <button
                                key={opt.label}
                                style={{ ...btnBase, opacity: canGoBack ? 1 : 0.3, cursor: canGoBack ? 'pointer' : 'default' }}
                                disabled={!canGoBack}
                                onClick={() => spectateBuffer.goBack(opt.ms)}
                                title={`Go back ${opt.label}`}
                            >
                                -{opt.label}
                            </button>
                        );
                    })}
                    <button
                        style={{ ...btnBase, opacity: messages.length > 0 ? 1 : 0.3 }}
                        disabled={messages.length === 0}
                        onClick={() => spectateBuffer.seekTo(sessionStart)}
                        title="Go to session start"
                    >
                        Start
                    </button>
                    <div style={{
                        marginLeft: '4px',
                        background: 'rgba(255,60,60,0.15)',
                        border: '1px solid rgba(255,60,60,0.4)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        color: '#ff6060',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff4444', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
                        LIVE
                    </div>
                </div>
            </div>
        );
    }

    // Full DVR panel: scrubber + play/pause + jump to live
    return (
        <div style={hudStyle}>
            {/* Top row: time + lag + jump to live */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#aaa', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(currentPositionMs)} / {fmt(sessionDurationMs)}
                </span>
                {lagMs > 1000 && (
                    <span style={{ fontSize: '0.68rem', color: '#f0a040', background: 'rgba(240,160,64,0.1)', borderRadius: '4px', padding: '1px 5px' }}>
                        -{fmt(lagMs)}
                    </span>
                )}
                <div style={{ flex: 1 }} />
                <button
                    onClick={spectateBuffer.jumpToLive}
                    style={{
                        ...btnBase,
                        background: 'rgba(255,60,60,0.12)',
                        border: '1px solid rgba(255,60,60,0.4)',
                        color: '#ff6060',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        padding: '3px 10px',
                    }}
                >
                    <Zap size={12} />
                    LIVE
                </button>
            </div>

            {/* Scrubber */}
            <div
                ref={scrubberRef}
                style={{ position: 'relative', height: '8px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', cursor: 'pointer' }}
                onClick={handleScrubberClick}
            >
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${progress}%`, backgroundColor: '#4a90e2',
                    borderRadius: '4px', boxShadow: '0 0 8px rgba(74,144,226,0.5)',
                    opacity: 0.7, transition: 'width 0.2s linear',
                }} />
                {/* Playhead dot */}
                <div style={{
                    position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
                    left: `${progress}%`, width: '12px', height: '12px',
                    borderRadius: '50%', background: '#fff',
                    boxShadow: '0 0 6px rgba(74,144,226,0.8)',
                    pointerEvents: 'none',
                }} />
            </div>

            {/* Controls row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                    onClick={spectateBuffer.isPlaying ? spectateBuffer.pause : spectateBuffer.play}
                    style={{ ...btnBase, border: '1px solid rgba(74,144,226,0.4)', color: '#4a90e2' }}
                    title={spectateBuffer.isPlaying ? 'Pause' : 'Play forward'}
                >
                    {spectateBuffer.isPlaying ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <span style={{ fontSize: '0.65rem', color: '#666', marginLeft: '2px' }}>Jump back:</span>
                {REWIND_OPTIONS.map(opt => (
                    <button
                        key={opt.label}
                        style={btnBase}
                        onClick={() => spectateBuffer.goBack(opt.ms)}
                        title={`Go back ${opt.label} from now`}
                    >
                        -{opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
