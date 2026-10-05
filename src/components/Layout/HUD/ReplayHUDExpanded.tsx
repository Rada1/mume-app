/**
 * @file ReplayHUDExpanded.tsx
 * @description Expanded replay search, timeline, and playback controls.
 */

import React from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ReplayHUDActionControls } from './ReplayHUDActionControls';
import type { ReplayHUDBaseProps } from './ReplayHUDTypes';

// --- Rendering Section ---
interface ReplayHUDExpandedProps extends ReplayHUDBaseProps {
    isTrimMode: boolean;
    toggleTrimMode: () => void;
    jumpToFlag: (dir: 'next' | 'prev') => void;
}

export const ReplayHUDExpanded: React.FC<ReplayHUDExpandedProps> = (props) => {
    // --- Logic Section ---
    const { replayer, isMobile, isHovered, setIsHovered, setIsMinimized, searchQuery, handleSearch, jumpToResult, jumpToFlag, flagMarkers, progress, formatTime, isTrimMode, toggleTrimMode } = props;
    const { state, seek, pause, setTrimRange } = replayer;
    // --- Rendering Section ---
    return (
        <div 
            className="replay-hud"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: isMobile ? 'fixed' : 'absolute',
                top: isMobile ? 'auto' : 'calc(var(--shop-panel-top, 64px) - 6px)',
                bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 18px)' : undefined,
                left: isMobile ? '8px' : 0,
                right: isMobile ? '8px' : 0,
                backgroundColor: isMobile ? 'rgba(13, 16, 23, 0.94)' : 'rgba(13, 16, 23, 0.62)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.07)' : 'none',
                borderRadius: isMobile ? '12px' : '0 0 12px 12px',
                padding: isMobile ? '12px 12px 16px' : '28px 20px 16px 20px',
                maxHeight: isMobile ? 'min(45vh, 380px)' : undefined,
                overflowY: isMobile ? 'auto' : undefined,
                zIndex: 9400,
                backdropFilter: 'blur(10px)',
                boxShadow: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'opacity 0.3s ease',
                opacity: isHovered || !state.isPlaying ? 1 : 0.6,
                touchAction: isMobile ? 'pan-y' : 'none'
            }}
        >
            {/* Top Row: Info & Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: isMobile ? '38px' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
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
                {isMobile && (
                    <button
                        onClick={() => setIsMinimized(true)}
                        title="Minimize Replay Controls"
                        aria-label="Minimize replay controls"
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.75)',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.14)',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <ChevronDown size={18} />
                    </button>
                )}
            </div>

            {/* Search Row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
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

            <ReplayHUDActionControls replayer={replayer} isMobile={isMobile} isTrimMode={isTrimMode} toggleTrimMode={toggleTrimMode} />
            {/* Center Minimize/ChevronUp Button */}
            {!isMobile && <button
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
            </button>}
        </div>
    );
};
