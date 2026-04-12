/**
 * @file RecorderHUD.tsx
 * @description Small indicator for session recording.
 */

import React from 'react';
import { useUI } from '../../../context/GameContext';
import { Circle } from 'lucide-react';
import './LineCluster.css'; // Reuse some HUD styles or we'll add our own

export const RecorderHUD: React.FC = () => {
    const { isRecording, duration } = useUI();

    if (!isRecording) return null;

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="recorder-hud" style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
            borderRadius: '12px',
            border: '1px solid rgba(255,0,0,0.4)',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none'
        }}>
            <Circle size={10} fill="#ff4444" color="#ff4444" className="animate-pulse" />
            <span style={{ 
                color: '#ff4444', 
                fontSize: '0.75rem', 
                fontWeight: 'bold',
                fontFamily: 'monospace'
            }}>
                REC {formatDuration(duration)}
            </span>
        </div>
    );
};
