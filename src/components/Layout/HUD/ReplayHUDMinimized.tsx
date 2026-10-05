/**
 * @file ReplayHUDMinimized.tsx
 * @description Compact replay playback controls for the HUD.
 */

import React from 'react';
import { Play, Pause, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { ReplayHUDBaseProps } from './ReplayHUDTypes';

// --- Rendering Section ---
interface ReplayHUDMinimizedProps extends ReplayHUDBaseProps {
    isTrimMode: boolean;
}

export const ReplayHUDMinimized: React.FC<ReplayHUDMinimizedProps> = (props) => {
    // --- Logic Section ---
    const { replayer, progress, flagMarkers, isMobile, isHovered, setIsHovered, setIsMinimized, searchQuery, handleSearch, jumpToResult, formatTime, isTrimMode } = props;
    const { state, play, pause, seek, setTrimRange } = replayer;
    // --- Rendering Section ---
        return (
            <div 
                className="replay-hud minimized"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    position: isMobile ? 'fixed' : 'absolute',
                    top: isMobile ? 'auto' : 'calc(var(--shop-panel-top, 64px) - 6px)',
                    bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 18px)' : undefined,
                    left: isMobile ? '8px' : 0,
                    right: isMobile ? '8px' : 0,
                    backgroundColor: isMobile ? 'rgba(13, 16, 23, 0.92)' : 'rgba(13, 16, 23, 0.62)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.07)' : 'none',
                    borderRadius: isMobile ? '12px' : '0 0 12px 12px',
                    padding: isMobile ? '10px 48px 10px 12px' : '28px 16px 12px 16px',
                    zIndex: 9400,
                    backdropFilter: 'blur(10px)',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'opacity 0.3s ease',
                    opacity: isHovered || !state.isPlaying ? 1 : 0.6,
                    touchAction: isMobile ? 'pan-y' : 'none'
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

                {isMobile && (
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                        {formatTime(state.currentTime)} / {formatTime(state.duration)}
                    </span>
                )}

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
                <div style={{ display: isMobile ? 'none' : 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
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
                    aria-label="Expand replay controls"
                    style={{
                        position: 'absolute',
                        ...(isMobile
                            ? { top: '6px', right: '6px', left: 'auto', bottom: 'auto', transform: 'none' }
                            : { bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }),
                        background: isMobile ? 'rgba(255,255,255,0.08)' : 'none',
                        border: isMobile ? '1px solid rgba(255,255,255,0.14)' : 'none',
                        borderRadius: isMobile ? '8px' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: isMobile ? '7px' : '4px',
                        zIndex: 9605,
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#4a90e2';
                        e.currentTarget.style.transform = isMobile ? 'scale(1.1)' : 'translateX(-50%) scale(1.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                        e.currentTarget.style.transform = isMobile ? 'none' : 'translateX(-50%)';
                    }}
                >
                    {isMobile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>
        );

};
