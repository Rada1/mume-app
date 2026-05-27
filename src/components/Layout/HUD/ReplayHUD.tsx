/**
 * @file ReplayHUD.tsx
 * @description HUD component for session playback controls.
 */

import React, { useState, useMemo } from 'react';
import { useUI } from '../../../context/GameContext';
import {
    Play, Pause, Square, FastForward, Rewind, Download, Eye, EyeOff,
    Search, ChevronLeft, ChevronRight, Scissors, ChevronUp, ChevronDown
} from 'lucide-react';

import { useViewport } from '../../../hooks/useViewport';
import { useSessionStore } from '../../../stores/useSessionStore';

export const ReplayHUD: React.FC = () => {
    const { replayer } = useUI();
    const { log, state, play, pause, seek, setSpeed, setPrivacyMode, startExport, stopExport, performSearch, setTrimRange } = replayer;
    const { isMobile } = useViewport();

    const flagMarkers = useMemo(() => {
        if (!log?.log) return [];
        return log.log
            .filter((e): e is any => e.typ === 'flag')
            .map(e => ({ t: e.t, kind: e.d.kind as 'death_self' | 'death_enemy_player', name: e.d.name as string | undefined }));
    }, [log]);

    const jumpToFlag = (dir: 'next' | 'prev') => {
        if (!flagMarkers.length) return;
        if (dir === 'next') {
            const next = flagMarkers.find(f => f.t > state.currentTime + 100);
            seek(next !== undefined ? next.t : flagMarkers[0].t);
        } else {
            const prevs = flagMarkers.filter(f => f.t < state.currentTime - 100);
            seek(prevs.length ? prevs[prevs.length - 1].t : flagMarkers[flagMarkers.length - 1].t);
        }
    };
    const [isHovered, setIsHovered] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTrimMode, setIsTrimMode] = useState(false);
    
    const isMinimized = useSessionStore(state => state.isReplayHUDMinimized);
    const setIsMinimized = useSessionStore(state => state.setIsReplayHUDMinimized);

    // Draggable position logic
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = React.useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        if (
            target.closest('button') || 
            target.closest('input') || 
            target.closest('.replay-scrubber-track') || 
            target.closest('.death-flag-marker')
        ) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            posX: position.x,
            posY: position.y
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragStartRef.current) return;
        const dx = e.clientX - dragStartRef.current.startX;
        const dy = e.clientY - dragStartRef.current.startY;
        setPosition({
            x: dragStartRef.current.posX + dx,
            y: dragStartRef.current.posY + dy
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!dragStartRef.current) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        dragStartRef.current = null;
        setIsDragging(false);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        performSearch(e.target.value);
    };

    const toggleTrimMode = () => {
        if (!isTrimMode) {
            // Default to whole log if no trim set
            if (state.trimRange[0] === null) setTrimRange([0, state.duration]);
            setIsTrimMode(true);
        } else {
            setIsTrimMode(false);
        }
    };

    const jumpToResult = (dir: 'next' | 'prev') => {
        if (!state.searchResults.length) return;
        
        let targetTime = 0;
        if (dir === 'next') {
            const next = state.searchResults.find(t => t > state.currentTime + 100);
            targetTime = next !== undefined ? next : state.searchResults[0];
        } else {
            const prevs = state.searchResults.filter(t => t < state.currentTime - 100);
            targetTime = prevs.length ? prevs[prevs.length - 1] : state.searchResults[state.searchResults.length - 1];
        }
        
        seek(targetTime);
    };

    
    if (!state.duration || !state.isVisible) {
        return null;
    }

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = (state.currentTime / state.duration) * 100;

    if (isMinimized) {
        return (
            <div 
                className="replay-hud minimized"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    position: 'absolute',
                    top: 'calc(var(--shop-panel-top, 64px) - 6px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(13, 16, 23, 0.62)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    padding: '28px 16px 12px 16px',
                    zIndex: 9400,
                    backdropFilter: 'blur(10px)',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'opacity 0.3s ease',
                    opacity: isHovered || !state.isPlaying ? 1 : 0.6,
                    touchAction: 'none'
                }}
            >
                {/* Play/Pause Button */}
                <button 
                    onClick={() => state.isPlaying ? pause() : play()}
                    style={{ 
                        background: '#4a90e2', border: 'none', borderRadius: '50%', 
                        width: '28px', height: '28px', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', color: '#fff', 
                        cursor: 'pointer', boxShadow: '0 2px 6px rgba(74,144,226,0.3)',
                        flexShrink: 0
                    }}
                >
                    {state.isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" style={{ marginLeft: '1px' }} />}
                </button>

                {/* Scrubber */}
                <div className="replay-scrubber-track"
                     style={{ position: 'relative', height: '8px', flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', cursor: 'pointer', minWidth: '80px' }}
                     onClick={(e) => {
                         const rect = e.currentTarget.getBoundingClientRect();
                         const x = e.clientX - rect.left;
                         const pct = x / rect.width;
                         seek(pct * state.duration);
                     }}
                >
                    {/* Background Full Track */}
                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                    
                    {/* Trimmed Selection Highlight */}
                    {isTrimMode && state.trimRange[0] !== null && state.trimRange[1] !== null && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: `${(state.trimRange[0] / state.duration) * 100}%`,
                            width: `${((state.trimRange[1] - state.trimRange[0]) / state.duration) * 100}%`,
                            height: '100%',
                            backgroundColor: 'rgba(74, 144, 226, 0.3)',
                            borderLeft: '1px solid #4a90e2',
                            borderRight: '1px solid #4a90e2',
                            zIndex: 1
                        }} />
                    )}

                    {/* Progress Fill */}
                    <div style={{ 
                        position: 'absolute', top: 0, left: 0, height: '100%', 
                        width: `${progress}%`, backgroundColor: '#4a90e2', 
                        borderRadius: '4px', boxShadow: '0 0 8px rgba(74, 144, 226, 0.5)',
                        opacity: 0.6,
                        zIndex: 2
                    }} />
                    
                    {/* Search Markers */}
                    {state.searchResults?.map((t, idx) => (
                        <div
                            key={idx}
                            style={{
                                position: 'absolute',
                                left: `${(t / state.duration) * 100}%`,
                                top: '-2px',
                                width: '2px',
                                height: '12px',
                                backgroundColor: '#fff',
                                boxShadow: '0 0 4px #4a90e2',
                                pointerEvents: 'none',
                                zIndex: 3
                            }}
                        />
                    ))}

                    {/* Death Flag Markers */}
                    {flagMarkers.map((f, idx) => (
                        <div
                            key={`flag-${idx}`}
                            className="death-flag-marker"
                            title={f.kind === 'death_self' ? 'You died here' : `${f.name ?? 'Enemy player'} died here`}
                            onClick={(e) => { e.stopPropagation(); seek(f.t); }}
                            style={{
                                position: 'absolute',
                                left: `${(f.t / state.duration) * 100}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: f.kind === 'death_self' ? '#ff4444' : '#ffd700',
                                boxShadow: f.kind === 'death_self'
                                    ? '0 0 4px rgba(255,68,68,0.8)'
                                    : '0 0 4px rgba(255,215,0,0.8)',
                                cursor: 'pointer',
                                zIndex: 3
                            }}
                        />
                    ))}

                    {/* Main Playhead */}
                    <div style={{
                        position: 'absolute', top: '50%', left: `${progress}%`,
                        width: '10px', height: '10px', backgroundColor: '#fff',
                        borderRadius: '50%', transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 6px rgba(0,0,0,0.8)',
                        zIndex: 4
                    }} />
                </div>

                {/* Compact Search Row */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ position: 'relative', width: '100px' }}>
                        <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={handleSearch}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    pause();
                                    jumpToResult('next');
                                }
                            }}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                padding: '4px 6px 4px 24px',
                                color: '#fff',
                                fontSize: '0.75rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                    {state.searchResults?.length > 0 && (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', background: 'rgba(74, 144, 226, 0.1)', borderRadius: '6px', padding: '2px' }}>
                            <button onClick={() => jumpToResult('prev')} style={{ background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', padding: '1px', display: 'flex' }}><ChevronLeft size={12} /></button>
                            <span style={{ fontSize: '0.65rem', color: '#4a90e2', fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>
                                {state.searchResults.filter(t => t <= state.currentTime).length}/{state.searchResults.length}
                            </span>
                            <button onClick={() => jumpToResult('next')} style={{ background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', padding: '1px', display: 'flex' }}><ChevronRight size={12} /></button>
                        </div>
                    )}
                </div>


                {/* Center Maximize/ChevronDown Button */}
                <button
                    onClick={() => setIsMinimized(false)}
                    title="Maximize Replay Controls"
                    style={{
                        position: 'absolute',
                        bottom: '-6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: '4px',
                        zIndex: 9605,
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#4a90e2';
                        e.currentTarget.style.transform = 'translateX(-50%) scale(1.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                        e.currentTarget.style.transform = 'translateX(-50%)';
                    }}
                >
                    <ChevronDown size={18} />
                </button>
            </div>
        );
    }

    return (
        <div 
            className="replay-hud"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'absolute',
                top: 'calc(var(--shop-panel-top, 64px) - 6px)',
                left: 0,
                right: 0,
                backgroundColor: 'rgba(13, 16, 23, 0.62)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                padding: '28px 20px 16px 20px',
                zIndex: 9400,
                backdropFilter: 'blur(10px)',
                boxShadow: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'opacity 0.3s ease',
                opacity: isHovered || !state.isPlaying ? 1 : 0.6,
                touchAction: 'none'
            }}
        >
            {/* Top Row: Info & Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        backgroundColor: '#4a90e2', boxShadow: '0 0 8px #4a90e2' 
                    }} />
                    <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                        REPLAY MODE
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                        {formatTime(state.currentTime)} / {formatTime(state.duration)}
                    </span>
                </div>
            </div>

            {/* Search Row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input 
                        type="text"
                        placeholder="Search session log..."
                        value={searchQuery}
                        onChange={handleSearch}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                pause();
                                jumpToResult('next');
                            }
                        }}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '6px 12px 6px 32px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            outline: 'none'
                        }}
                    />
                </div>
                {state.searchResults?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(74, 144, 226, 0.1)', borderRadius: '8px', padding: '2px 4px' }}>
                        <button onClick={() => jumpToResult('prev')} style={{ background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', padding: '2px' }}><ChevronLeft size={16} /></button>
                        <span style={{ fontSize: '0.7rem', color: '#4a90e2', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
                            {state.searchResults.filter(t => t <= state.currentTime).length} / {state.searchResults.length}
                        </span>
                        <button onClick={() => jumpToResult('next')} style={{ background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', padding: '2px' }}><ChevronRight size={16} /></button>
                    </div>
                )}
                {flagMarkers.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(255,68,68,0.08)', borderRadius: '8px', padding: '2px 6px' }}>
                        <button onClick={() => jumpToFlag('prev')} style={{ background: 'none', border: 'none', color: '#ff8888', cursor: 'pointer', padding: '2px' }}><ChevronLeft size={14} /></button>
                        <span style={{ fontSize: '0.65rem', color: '#ff8888', fontWeight: 'bold' }}>
                            ☠ {flagMarkers.filter(f => f.t <= state.currentTime).length}/{flagMarkers.length}
                        </span>
                        <button onClick={() => jumpToFlag('next')} style={{ background: 'none', border: 'none', color: '#ff8888', cursor: 'pointer', padding: '2px' }}><ChevronRight size={14} /></button>
                    </div>
                )}
            </div>

            {/* Scrubber */}
            <div className="replay-scrubber-track"
                 style={{ position: 'relative', height: '10px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px', cursor: 'pointer' }}
                 onClick={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const x = e.clientX - rect.left;
                     const pct = x / rect.width;
                     seek(pct * state.duration);
                 }}
            >
                {/* Background Full Track */}
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px' }} />
                
                {/* Trimmed Selection Highlight */}
                {isTrimMode && state.trimRange[0] !== null && state.trimRange[1] !== null && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: `${(state.trimRange[0] / state.duration) * 100}%`,
                        width: `${((state.trimRange[1] - state.trimRange[0]) / state.duration) * 100}%`,
                        height: '100%',
                        backgroundColor: 'rgba(74, 144, 226, 0.3)',
                        borderLeft: '2px solid #4a90e2',
                        borderRight: '2px solid #4a90e2',
                        zIndex: 1
                    }} />
                )}

                {/* Progress Fill */}
                <div style={{ 
                    position: 'absolute', top: 0, left: 0, height: '100%', 
                    width: `${progress}%`, backgroundColor: '#4a90e2', 
                    borderRadius: '5px', boxShadow: '0 0 10px rgba(74, 144, 226, 0.5)',
                    opacity: 0.6,
                    zIndex: 2
                }} />
                
                {/* Search Markers */}
                {state.searchResults?.map((t, idx) => (
                    <div
                        key={idx}
                        style={{
                            position: 'absolute',
                            left: `${(t / state.duration) * 100}%`,
                            top: '-2px',
                            width: '2px',
                            height: '14px',
                            backgroundColor: '#fff',
                            boxShadow: '0 0 4px #4a90e2',
                            pointerEvents: 'none',
                            zIndex: 3
                        }}
                    />
                ))}

                {/* Death Flag Markers */}
                {flagMarkers.map((f, idx) => (
                    <div
                        key={`flag-${idx}`}
                        className="death-flag-marker"
                        title={f.kind === 'death_self' ? 'You died here' : `${f.name ?? 'Enemy player'} died here`}
                        onClick={(e) => { e.stopPropagation(); seek(f.t); }}
                        style={{
                            position: 'absolute',
                            left: `${(f.t / state.duration) * 100}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: f.kind === 'death_self' ? '#ff4444' : '#ffd700',
                            boxShadow: f.kind === 'death_self'
                                ? '0 0 6px rgba(255,68,68,0.8)'
                                : '0 0 6px rgba(255,215,0,0.8)',
                            cursor: 'pointer',
                            zIndex: 3
                        }}
                    />
                ))}

                {/* Main Playhead */}
                <div style={{
                    position: 'absolute', top: '50%', left: `${progress}%`,
                    width: '14px', height: '14px', backgroundColor: '#fff',
                    borderRadius: '50%', transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 8px rgba(0,0,0,0.8)',
                    zIndex: 4
                }} />
            </div>

            {/* Trim Controls Row (Only shown in Trim Mode) */}
            {isTrimMode && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', padding: '4px', backgroundColor: 'rgba(74, 144, 226, 0.1)', borderRadius: '8px' }}>
                    <button 
                        onClick={() => setTrimRange([state.currentTime, state.trimRange[1] ?? state.duration])}
                        style={{ background: '#4a90e2', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                        MARK START
                    </button>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                        {formatTime(state.trimRange[0] || 0)} - {formatTime(state.trimRange[1] || state.duration)}
                    </span>
                    <button 
                        onClick={() => setTrimRange([state.trimRange[0] ?? 0, state.currentTime])}
                        style={{ background: '#4a90e2', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                        MARK END
                    </button>
                    <button 
                         onClick={() => setTrimRange([0, state.duration])}
                         style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', cursor: 'pointer', marginLeft: '8px' }}
                    >
                        RESET
                    </button>
                </div>
            )}

            {/* Controls Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button 
                        onClick={() => state.isPlaying ? pause() : play()}
                        style={{ 
                            background: '#4a90e2', border: 'none', borderRadius: '50%', 
                            width: '40px', height: '40px', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', color: '#fff', 
                            cursor: 'pointer', boxShadow: '0 4px 12px rgba(74,144,226,0.3)' 
                        }}
                    >
                        {state.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '3px' }} />}
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 5].map(s => (
                            <button 
                                key={s}
                                onClick={() => setSpeed(s)}
                                style={{ 
                                    background: state.speed === s ? 'rgba(74, 144, 226, 0.2)' : 'none',
                                    border: `1px solid ${state.speed === s ? '#4a90e2' : 'rgba(255,255,255,0.1)'}`,
                                    color: state.speed === s ? '#4a90e2' : 'rgba(255,255,255,0.5)',
                                    borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer'
                                }}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        title="Toggle Trim Mode"
                        onClick={toggleTrimMode}
                        style={{ 
                            background: isTrimMode ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255,255,255,0.05)', 
                            border: `1px solid ${isTrimMode ? '#4a90e2' : 'rgba(255,255,255,0.1)'}`, 
                            color: isTrimMode ? '#4a90e2' : 'rgba(255,255,255,0.7)', 
                            borderRadius: '8px', 
                            padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Scissors size={16} />
                        <span style={{ fontSize: '0.75rem' }}>TRIM</span>
                    </button>

                    <button 
                        title={state.isPrivacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
                        onClick={() => setPrivacyMode(!state.isPrivacyMode)}
                        style={{ 
                            background: state.isPrivacyMode ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255,255,255,0.05)', 
                            border: `1px solid ${state.isPrivacyMode ? '#4a90e2' : 'rgba(255,255,255,0.1)'}`, 
                            color: state.isPrivacyMode ? '#4a90e2' : 'rgba(255,255,255,0.7)', 
                            borderRadius: '8px', 
                            padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {state.isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
                        <span style={{ fontSize: '0.75rem' }}>PRIVACY</span>
                    </button>

                    <div style={{ position: 'relative' }}>
                        <button 
                            title={state.isExporting ? "Stop Export" : "Export Video"}
                            onClick={() => {
                                if (state.isExporting) stopExport();
                                else startExport();
                            }}
                            style={{ 
                                background: state.isExporting ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', 
                                border: `1px solid ${state.isExporting ? '#ff4444' : 'rgba(255,255,255,0.1)'}`, 
                                color: state.isExporting ? '#ff4444' : 'rgba(255,255,255,0.7)', 
                                borderRadius: '8px', 
                                padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {state.isExporting ? (
                                <>
                                    <div style={{ width: '8px', height: '8px', backgroundColor: '#ff4444', borderRadius: '50%' }} className="animate-pulse" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>RECORDING...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span style={{ fontSize: '0.75rem' }}>EXPORT</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            {/* Center Minimize/ChevronUp Button */}
            <button
                onClick={() => setIsMinimized(true)}
                title="Minimize Replay Controls"
                style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    padding: '4px',
                    zIndex: 9605,
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#4a90e2';
                    e.currentTarget.style.transform = 'translateX(-50%) scale(1.25)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                    e.currentTarget.style.transform = 'translateX(-50%)';
                }}
            >
                <ChevronUp size={18} />
            </button>
        </div>
    );
};
