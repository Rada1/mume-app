import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export const DiagnosticOverlay: React.FC = () => {
    const { diagnosticLogs } = useGame();
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: isVisible ? '0' : 'auto',
            zIndex: 9999,
            pointerEvents: isVisible ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease'
        }}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsVisible(!isVisible); }}
                style={{
                    height: '30px',
                    background: isVisible ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 0, 0, 0.8)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontWeight: 'bold',
                    pointerEvents: 'auto',
                    width: '100px',
                    alignSelf: 'center',
                    borderRadius: '0 0 8px 8px',
                    fontSize: '0.6rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}
            >
                {isVisible ? 'HIDE LOGS' : 'DEBUG LOGS'}
            </button>
            
            {isVisible && (
                <div style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.85)',
                    color: '#0f0',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    padding: '10px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    borderBottom: '2px solid #0f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <strong>DIAGNOSTIC CONSOLE</strong>
                        <button onClick={() => window.location.reload()} style={{ background: '#333', color: '#fff', border: '1px solid #666', fontSize: '0.6rem' }}>RELOAD</button>
                    </div>
                    {diagnosticLogs.map((log, i) => (
                        <div key={i} style={{ borderBottom: '1px solid #333', padding: '2px 0' }}>
                            {log}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
