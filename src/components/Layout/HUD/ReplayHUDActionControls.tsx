/**
 * @file ReplayHUDActionControls.tsx
 * @description Playback, trim, privacy, and export actions for replay HUD.
 */

import React from 'react';
import { Play, Pause, Scissors, Download, Eye, EyeOff } from 'lucide-react';
import type { ReplayHUDReplayer } from './ReplayHUDTypes';

// --- Rendering Section ---
interface ReplayHUDActionControlsProps {
    replayer: ReplayHUDReplayer;
    isMobile: boolean;
    isTrimMode: boolean;
    toggleTrimMode: () => void;
}

export const ReplayHUDActionControls: React.FC<ReplayHUDActionControlsProps> = ({ replayer, isMobile, isTrimMode, toggleTrimMode }) => {
    // --- Logic Section ---
    const { state, play, pause, setSpeed, setPrivacyMode, startExport, stopExport } = replayer;
    // --- Rendering Section ---
    return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px', alignItems: 'center' }}>
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

                <div style={{ display: 'flex', gap: isMobile ? '6px' : '12px' }}>
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
        );
};
