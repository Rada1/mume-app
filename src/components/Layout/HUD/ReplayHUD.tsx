/**
 * @file ReplayHUD.tsx
 * @description HUD component for session playback controls.
 */

import React, { useState } from 'react';
import { useUI } from '../../../context/GameContext';
import { 
    Play, Pause, Square, FastForward, Rewind, Download, Video, X, Eye, EyeOff,
    Search, ChevronLeft, ChevronRight 
} from 'lucide-react';

export const ReplayHUD: React.FC = () => {
    const { replayer } = useUI();
    const { state, play, pause, seek, setSpeed, setPrivacyMode, loadLog, startExport, stopExport, setIsVisible, performSearch } = replayer;
    const [isHovered, setIsHovered] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        performSearch(e.target.value);
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

    console.log('[ReplayHUD] Rendering, duration:', state.duration, 'currentTime:', state.currentTime, 'isVisible:', state.isVisible);
    
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
                zIndex: 10000,
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
                <button 
                    onClick={() => { replayer.setIsVisible(false); }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                >
                    <X size={18} />
                </button>
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
            <div style={{ position: 'relative', height: '6px', width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', cursor: 'pointer' }}
                 onClick={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const x = e.clientX - rect.left;
                     const pct = x / rect.width;
                     seek(pct * state.duration);
                 }}
            >
                <div style={{ 
                    position: 'absolute', top: 0, left: 0, height: '100%', 
                    width: `${progress}%`, backgroundColor: '#4a90e2', 
                    borderRadius: '3px', boxShadow: '0 0 10px rgba(74, 144, 226, 0.5)'
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
                            height: '10px',
                            backgroundColor: '#fff',
                            boxShadow: '0 0 4px #4a90e2',
                            pointerEvents: 'none',
                            zIndex: 1
                        }}
                    />
                ))}

                <div style={{
                    position: 'absolute', top: '50%', left: `${progress}%`,
                    width: '12px', height: '12px', backgroundColor: '#fff',
                    borderRadius: '50%', transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                    zIndex: 2
                }} />
            </div>

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

                    <button 
                        title={state.isExporting ? "Stop Export" : "Export to MP4"}
                        onClick={() => state.isExporting ? stopExport() : startExport()}
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
                                <Video size={16} />
                                <span style={{ fontSize: '0.75rem' }}>EXPORT</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
