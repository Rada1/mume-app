/**
 * @file ReplayHUD.tsx
 * @description HUD component for session playback controls.
 */

import React, { useState } from 'react';
import { useUI } from '../../../context/GameContext';
import { 
    Play, Pause, Square, FastForward, Rewind, Download, Video, X, Eye, EyeOff,
    Search, ChevronLeft, ChevronRight, FileText, Scissors
} from 'lucide-react';

export const ReplayHUD: React.FC = () => {
    const { replayer, setUI } = useUI();
    const { state, play, pause, seek, setSpeed, setPrivacyMode, loadLog, startExport, exportAsText, stopExport, setIsVisible, performSearch, setTrimRange } = replayer;
    const [isHovered, setIsHovered] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTrimMode, setIsTrimMode] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

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

    return (
        <div 
            className="replay-hud"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'fixed',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '600px',
                backgroundColor: 'rgba(20, 25, 35, 0.95)',
                border: '1px solid rgba(74, 144, 226, 0.4)',
                borderRadius: '16px',
                padding: '12px 20px',
                zIndex: 9000,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'opacity 0.3s ease',
                opacity: isHovered || !state.isPlaying ? 1 : 0.6
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
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => setUI(s => ({ ...s, drawer: s.drawer === 'session-log' ? 'none' : 'session-log' }))}
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                            color: '#fff', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem'
                        }}
                    >
                        <FileText size={16} />
                        ARCHIVE
                    </button>
                    <button 
                        onClick={() => { replayer.setIsVisible(false); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                    >
                        <X size={18} />
                    </button>
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
            </div>

            {/* Scrubber */}
            <div style={{ position: 'relative', height: '10px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px', cursor: 'pointer' }}
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

                    <div style={{ position: 'relative' }} onMouseEnter={() => setShowExportMenu(true)} onMouseLeave={() => setShowExportMenu(false)}>
                        {showExportMenu && !state.isExporting && (
                            <div style={{ 
                                position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px',
                                background: 'rgba(20, 25, 35, 0.95)', border: '1px solid rgba(74, 144, 226, 0.4)',
                                borderRadius: '12px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px',
                                backdropFilter: 'blur(12px)', boxShadow: '0 -4px 16px rgba(0,0,0,0.5)', zIndex: 10001,
                                width: '120px'
                            }}>
                                <button 
                                    onClick={() => { exportAsText(); setShowExportMenu(false); }}
                                    style={{ 
                                        background: 'none', border: 'none', color: '#fff', borderRadius: '6px',
                                        padding: '8px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', 
                                        alignItems: 'center', gap: '8px', transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74, 144, 226, 0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <FileText size={16} color="#4a90e2" />
                                    TEXT
                                </button>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '2px 4px' }} />
                                <button 
                                    onClick={() => { startExport(); setShowExportMenu(false); }}
                                    style={{ 
                                        background: 'none', border: 'none', color: '#fff', borderRadius: '6px',
                                        padding: '8px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', 
                                        alignItems: 'center', gap: '8px', transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74, 144, 226, 0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <Video size={16} color="#4a90e2" />
                                    VIDEO
                                </button>
                            </div>
                        )}
                        
                        <button 
                            title={state.isExporting ? "Stop Export" : "Choose Export Type"}
                            onClick={() => {
                                if (state.isExporting) stopExport();
                                else setShowExportMenu(!showExportMenu);
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
        </div>
    );
};
